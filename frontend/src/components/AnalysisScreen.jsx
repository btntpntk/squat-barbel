import { useEffect, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { samplePoseSequence as defaultPoseSequence } from '../data/samplePose';
import { analyzePosture, getVideoUrl } from '../services/apiClient';
import { selectVisualizationFrame } from '../utils/heatmapUtils';
import { HumanModel } from './HumanModel';
import { HeatmapOverlay } from './HeatmapOverlay';
import { FeedbackPanel } from './FeedbackPanel';

const LOADING_STEPS = [
  'Preparing pose sequence…',
  'Sending to analysis server…',
  'Processing joint heatmap…',
  'Building 3D visualization…',
];

function deriveTransformed(poseFrame) {
  if (!poseFrame?.length) return [];

  const valid3d = poseFrame.filter(j => j.x_3d_meters != null && j.y_3d_meters != null && j.z_3d_meters != null);
  if (valid3d.length > 0) {
    const xs = valid3d.map(j => -j.x_3d_meters);
    const ys = valid3d.map(j => j.y_3d_meters);
    const zs = valid3d.map(j => j.z_3d_meters);
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    const cz = (Math.max(...zs) + Math.min(...zs)) / 2;
    return valid3d.map(j => ({
      ...j,
      tx:  -j.x_3d_meters - cx,
      ty: -(j.y_3d_meters - cy),
      tz: -(j.z_3d_meters - cz),
    }));
  }

  const valid2d = poseFrame.filter(j => j.x_norm != null && j.y_norm != null);
  if (!valid2d.length) return [];
  const xs = valid2d.map(j => -j.x_norm);
  const ys = valid2d.map(j => j.y_norm);
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  return valid2d.map(j => ({
    ...j,
    tx: -j.x_norm - cx,
    ty: -(j.y_norm - cy),
    tz: 0,
  }));
}

function VideoPlayer({ label, url }) {
  const [missing, setMissing] = useState(false);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </div>
      {missing ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(10,14,40,0.6)', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.05)',
          fontSize: 11, color: '#334155',
        }}>
          No video
        </div>
      ) : (
        <video
          src={url}
          controls
          onError={() => setMissing(true)}
          style={{ flex: 1, width: '100%', borderRadius: 8, background: '#000', objectFit: 'contain' }}
        />
      )}
    </div>
  );
}

function LoadingScreen() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const iv = setInterval(() =>
      setStep(s => (s < LOADING_STEPS.length - 1 ? s + 1 : s)), 900);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 32,
    }}>
      {/* Spinner ring */}
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        <div style={{
          position: 'absolute', inset: 0,
          border: '3px solid rgba(59,130,246,0.12)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          border: '3px solid transparent',
          borderTopColor: '#3b82f6',
          borderRightColor: '#8b5cf6',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          boxShadow: '0 0 20px rgba(59,130,246,0.3)',
        }} />
        <div style={{
          position: 'absolute', inset: 10,
          border: '2px solid transparent',
          borderBottomColor: 'rgba(139,92,246,0.5)',
          borderRadius: '50%',
          animation: 'spin 1.4s linear infinite reverse',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22,
        }}>🦴</div>
      </div>

      {/* Step text */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 18, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>
          {LOADING_STEPS[step]}
        </p>
        {/* Dot indicators */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {LOADING_STEPS.map((_, i) => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: '50%',
              background: i <= step ? '#3b82f6' : '#1e293b',
              boxShadow: i === step ? '0 0 8px #3b82f6' : 'none',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>
      </div>

      <p style={{ fontSize: 12, color: '#334155' }}>
        Demo mode active — works without a connected camera
      </p>
    </div>
  );
}

export function AnalysisScreen({ onReset, userInfo, poseSequence, repLabel, repId }) {
  const [status, setStatus]   = useState('loading');
  const [result, setResult]   = useState(null);
  const seq = poseSequence ?? defaultPoseSequence;

  useEffect(() => {
    let alive = true;
    const minDelay = new Promise(r => setTimeout(r, 3200));
    const request  = analyzePosture(seq);

    Promise.all([minDelay, request]).then(([, data]) => {
      if (alive) { setResult(data); setStatus('result'); }
    });

    return () => { alive = false; };
  }, [seq]);

  const { frameIndex, heatmapFrame, poseFrame, transformedJoints } = useMemo(() => {
    if (!result) return {};
    const { frameIndex, heatmapFrame } = selectVisualizationFrame(result);
    const poseFrame = seq[frameIndex] ?? seq[0];
    return { frameIndex, heatmapFrame, poseFrame, transformedJoints: deriveTransformed(poseFrame) };
  }, [result, seq]);

  if (status === 'loading') return <LoadingScreen />;

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* 3D Canvas + Video strip */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, position: 'relative' }}>

        {/* Phase badge */}
        <div className="fade-in-up" style={{
          position: 'absolute', top: 14, left: 14, zIndex: 10,
          background: 'rgba(5,8,28,0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(59,130,246,0.25)',
          borderRadius: 10, padding: '6px 14px',
          fontSize: 12, color: '#93c5fd',
        }}>
          {repLabel && <><strong style={{ color: '#67e8f9' }}>{repLabel}</strong> · </>}
          Viewing · <strong style={{ color: '#fff' }}>
            {result?.phase_per_frame?.[frameIndex] ?? 'BOTTOM'}
          </strong> · frame {frameIndex}
        </div>

        {/* Hint */}
        <div style={{
          position: 'absolute', bottom: 14, left: 14, zIndex: 10,
          fontSize: 10, color: '#1e293b', lineHeight: 1.8,
        }}>
          Drag to rotate · Scroll to zoom · Right-drag to pan
        </div>

        <Canvas
          camera={{ position: [0.4, 0.1, 2.3], fov: 46 }}
          style={{ background: 'transparent' }}
          gl={{ alpha: true }}
        >
          <ambientLight intensity={0.35} />
          <directionalLight position={[2, 4, 3]} intensity={1.0} castShadow />
          <pointLight position={[-3, 2, -2]} intensity={0.6} color="#4477ff" />
          <pointLight position={[1, -1, 2]} intensity={0.3} color="#ff3344" />

          {/* Ground grid */}
          <Grid
            position={[0, -0.98, 0]}
            args={[4, 4]}
            cellSize={0.2}
            cellThickness={0.5}
            cellColor="#0d1b3e"
            sectionSize={1}
            sectionThickness={1}
            sectionColor="#0f2a5a"
            fadeDistance={4}
            fadeStrength={1}
            infiniteGrid
          />

          <OrbitControls
            enableDamping dampingFactor={0.07}
            minDistance={0.8} maxDistance={6}
            target={[0, 0, 0]}
          />

          <HumanModel
            poseFrame={poseFrame}
            heatmapFrame={heatmapFrame}
            transformedJoints={transformedJoints}
          />

          {transformedJoints && heatmapFrame && (
            <HeatmapOverlay transformedJoints={transformedJoints} heatmapFrame={heatmapFrame} />
          )}
        </Canvas>
      </div>

        {/* Video strip */}
        {repId && (
          <div style={{
            height: 180, display: 'flex', gap: 8, padding: '8px 12px',
            borderTop: '1px solid rgba(59,130,246,0.1)',
            background: 'rgba(5,5,18,0.7)',
            flexShrink: 0,
          }}>
            <VideoPlayer label="Front view" url={getVideoUrl(repId, 'front')} />
            <VideoPlayer label="Side view"  url={getVideoUrl(repId, 'side')}  />
          </div>
        )}
      </div>

      {/* Sidebar */}
      <FeedbackPanel result={result} userInfo={userInfo} onReset={onReset} />
    </div>
  );
}
