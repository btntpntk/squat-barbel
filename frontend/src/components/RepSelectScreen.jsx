import { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { fetchReps, fetchPoseSequence } from '../services/apiClient';
import { PoseSkeleton } from './PoseSkeleton';

const FPS = 12;

function RepCard({ rep, selected, onSelect }) {
  return (
    <div
      onClick={() => onSelect(rep)}
      style={{
        padding: '16px 18px',
        borderRadius: 14,
        background: selected ? 'rgba(59,130,246,0.12)' : 'rgba(10,14,40,0.6)',
        border: `1.5px solid ${selected ? '#3b82f6' : 'rgba(255,255,255,0.07)'}`,
        cursor: 'pointer',
        boxShadow: selected ? '0 0 24px rgba(59,130,246,0.25)' : 'none',
        transition: 'all 0.2s',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: selected ? '#93c5fd' : '#e2e8f0' }}>
          {rep.session} · Rep {rep.rep_number}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 8px',
          borderRadius: 999, letterSpacing: '0.08em',
          background: selected ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)',
          color: selected ? '#93c5fd' : '#475569',
        }}>
          {rep.frame_count} FRAMES
        </span>
      </div>
      <div style={{ fontSize: 11, color: '#475569' }}>
        ≈ {(rep.frame_count / FPS).toFixed(1)}s at {FPS} fps
      </div>
    </div>
  );
}

function PreviewControls({ frameIndex, totalFrames, playing, onToggle, onScrub, onReset }) {
  const pct = totalFrames > 1 ? (frameIndex / (totalFrames - 1)) * 100 : 0;

  return (
    <div style={{
      position: 'absolute', bottom: 12, left: 12, right: 12, zIndex: 10,
      background: 'rgba(5,8,24,0.82)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(59,130,246,0.15)',
      borderRadius: 12, padding: '10px 14px',
    }}>
      <div style={{ position: 'relative', height: 4, marginBottom: 10, cursor: 'pointer' }}>
        <div style={{ position: 'absolute', inset: 0, background: '#1e293b', borderRadius: 2 }} />
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${pct}%`,
          background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)',
          borderRadius: 2, boxShadow: '0 0 8px rgba(59,130,246,0.6)',
        }} />
        <input type="range" min={0} max={Math.max(0, totalFrames - 1)} value={frameIndex}
          onChange={e => onScrub(Number(e.target.value))}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }}
        />
        <div style={{
          position: 'absolute', top: '50%', left: `${pct}%`,
          transform: 'translate(-50%,-50%)',
          width: 12, height: 12, borderRadius: '50%',
          background: '#3b82f6', border: '2px solid #fff',
          boxShadow: '0 0 10px rgba(59,130,246,0.8)', pointerEvents: 'none',
        }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onReset} title="Restart"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 14, padding: '2px 6px' }}>⏮</button>
        <button onClick={onToggle} style={{
          background: playing ? 'rgba(59,130,246,0.2)' : 'rgba(139,92,246,0.2)',
          border: `1px solid ${playing ? '#3b82f6' : '#7c3aed'}`,
          borderRadius: 8, cursor: 'pointer',
          color: playing ? '#93c5fd' : '#c4b5fd',
          fontSize: 16, width: 36, height: 30,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{playing ? '⏸' : '▶'}</button>
        <div style={{ flex: 1, fontSize: 12, color: '#64748b' }}>
          Frame <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{frameIndex + 1}</span>
          <span style={{ color: '#334155' }}> / {totalFrames}</span>
        </div>
        <div style={{ fontSize: 10, color: '#334155', padding: '2px 6px', background: 'rgba(255,255,255,0.04)', borderRadius: 4 }}>
          {FPS} fps
        </div>
      </div>
    </div>
  );
}

export function RepSelectScreen({ onAnalyze, onBack }) {
  const [reps, setReps]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [selectedRep, setSelectedRep] = useState(null);
  const [selectedPose, setSelectedPose] = useState(null);
  const [loadingPose, setLoadingPose]   = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying]       = useState(false);
  const intervalRef = useRef(null);

  // Fetch rep list on mount
  useEffect(() => {
    fetchReps()
      .then(data => { setReps(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  // Animation loop
  const totalFrames = selectedPose?.length ?? 0;
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (playing && totalFrames > 0) {
      intervalRef.current = setInterval(() => {
        setFrameIndex(f => (f + 1) % totalFrames);
      }, 1000 / FPS);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, totalFrames]);

  const handleSelect = useCallback((rep) => {
    setSelectedRep(rep);
    setSelectedPose(null);
    setFrameIndex(0);
    setPlaying(false);
    setLoadingPose(true);
    fetchPoseSequence(rep.id)
      .then(pose => {
        setSelectedPose(pose);
        setPlaying(true);
        setLoadingPose(false);
      })
      .catch(() => setLoadingPose(false));
  }, []);

  const handleScrub = useCallback((idx) => {
    setPlaying(false);
    setFrameIndex(idx);
  }, []);

  const handleReset = useCallback(() => {
    setFrameIndex(0);
    setPlaying(true);
  }, []);

  const handleAnalyze = () => {
    if (!selectedPose || !selectedRep) return;
    onAnalyze({
      poseSequence: selectedPose,
      repLabel: `${selectedRep.session} Rep ${selectedRep.rep_number}`,
      repId: selectedRep.id,
    });
  };

  const poseFrame = selectedPose?.[frameIndex] ?? null;

  return (
    <div className="fade-in-up" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* ── Left panel ── */}
      <div style={{
        width: 300, flexShrink: 0,
        padding: '20px 16px',
        borderRight: '1px solid rgba(59,130,246,0.1)',
        display: 'flex', flexDirection: 'column', gap: 12,
        overflowY: 'auto',
        background: 'rgba(5,5,18,0.5)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ marginBottom: 6 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', margin: 0 }}>Select Rep</h2>
          <p style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
            Preview the motion, then send to analysis
          </p>
        </div>

        {loading && (
          <div style={{ fontSize: 13, color: '#475569', textAlign: 'center', padding: '24px 0' }}>
            Loading reps…
          </div>
        )}

        {error && (
          <div style={{
            padding: '12px 14px', borderRadius: 10,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            fontSize: 12, color: '#ef4444',
          }}>
            Could not reach backend: {error}
          </div>
        )}

        {!loading && !error && reps.length === 0 && (
          <div style={{ fontSize: 12, color: '#475569', textAlign: 'center', padding: '24px 0' }}>
            No reps found. Start a session with the camera.
          </div>
        )}

        {reps.map(rep => (
          <RepCard
            key={rep.id}
            rep={rep}
            selected={selectedRep?.id === rep.id}
            onSelect={handleSelect}
          />
        ))}

        {selectedRep && (
          <div style={{
            padding: '12px 14px',
            background: 'rgba(59,130,246,0.06)',
            border: '1px solid rgba(59,130,246,0.12)',
            borderRadius: 10, fontSize: 11, color: '#64748b', lineHeight: 1.7,
          }}>
            <strong style={{ color: '#93c5fd' }}>{selectedRep.session} Rep {selectedRep.rep_number}</strong>
            <br />
            {loadingPose
              ? 'Loading pose data…'
              : `${totalFrames} frames · ≈ ${(totalFrames / FPS).toFixed(1)}s`
            }
          </div>
        )}

        <div style={{ flex: 1 }} />

        <button onClick={onBack} style={{
          padding: '11px', borderRadius: 10, cursor: 'pointer',
          background: 'transparent', border: '1px solid rgba(255,255,255,0.07)',
          color: '#475569', fontSize: 13, fontWeight: 600,
        }}>← Back</button>

        <button
          onClick={handleAnalyze}
          disabled={!selectedPose || loadingPose}
          className="btn-glow"
          style={{
            padding: '14px', borderRadius: 12,
            cursor: selectedPose ? 'pointer' : 'not-allowed',
            background: selectedPose
              ? 'linear-gradient(135deg,#2563eb,#7c3aed)'
              : 'rgba(30,41,59,0.5)',
            border: 'none', color: selectedPose ? '#fff' : '#334155',
            fontSize: 15, fontWeight: 800,
            letterSpacing: '0.02em', position: 'relative', overflow: 'hidden',
          }}
        >
          {selectedPose
            ? `Analyze ${selectedRep.session} Rep ${selectedRep.rep_number} →`
            : selectedRep ? 'Loading pose…' : 'Select a rep'
          }
        </button>
      </div>

      {/* ── Right panel: 3D preview ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 14, left: 14, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(5,8,24,0.8)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(34,211,238,0.2)',
          borderRadius: 10, padding: '6px 14px',
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: playing ? '#22d3ee' : '#475569',
            boxShadow: playing ? '0 0 8px #22d3ee' : 'none',
            transition: 'all 0.3s',
          }} />
          <span style={{ fontSize: 12, color: '#67e8f9', fontWeight: 600 }}>
            PREVIEW{selectedRep ? ` · ${selectedRep.session} Rep ${selectedRep.rep_number}` : ''}
          </span>
          {!selectedRep && <span style={{ fontSize: 11, color: '#475569' }}>· Select a rep</span>}
        </div>

        <Canvas
          camera={{ position: [0.4, 0.1, 2.4], fov: 46 }}
          style={{ background: 'transparent' }}
          gl={{ alpha: true }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight position={[2, 4, 3]} intensity={0.9} />
          <pointLight position={[-3, 2, -2]} intensity={0.4} color="#22d3ee" />

          <Grid
            position={[0, -0.98, 0]}
            args={[4, 4]} cellSize={0.2} cellThickness={0.5}
            cellColor="#061828" sectionSize={1} sectionThickness={1}
            sectionColor="#082040" fadeDistance={4} fadeStrength={1} infiniteGrid
          />

          <OrbitControls enableDamping dampingFactor={0.07} minDistance={0.8} maxDistance={6} />

          {poseFrame && (
            <PoseSkeleton poseFrame={poseFrame} heatmapFrame={null} previewMode={true} />
          )}
        </Canvas>

        {selectedPose && totalFrames > 0 && (
          <PreviewControls
            frameIndex={frameIndex}
            totalFrames={totalFrames}
            playing={playing}
            onToggle={() => setPlaying(p => !p)}
            onScrub={handleScrub}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}
