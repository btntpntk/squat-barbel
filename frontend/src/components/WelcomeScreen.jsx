const FEATURES = [
  { icon: '🎯', label: '33-Joint Tracking',    sub: 'Full body coverage' },
  { icon: '🔥', label: 'Live Heatmap',          sub: 'Error regions in red' },
  { icon: '⚡', label: 'Instant Analysis',      sub: 'Results in seconds' },
  { icon: '🛡️', label: 'No Account Needed',    sub: 'Guest session only' },
];

export function WelcomeScreen({ onMode, liveConnected }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px', gap: 0,
    }}>

      {/* Glow disc behind everything */}
      <div style={{
        position: 'absolute',
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      {/* Animated icon */}
      <div className="float-anim fade-in-up" style={{
        fontSize: 72, marginBottom: 28,
        filter: 'drop-shadow(0 0 24px rgba(59,130,246,0.6))',
      }}>
        🏋️
      </div>

      {/* Title */}
      <h1 className="fade-in-up-d1" style={{
        fontSize: 'clamp(36px, 5vw, 62px)',
        fontWeight: 900,
        lineHeight: 1.08,
        textAlign: 'center',
        margin: '0 0 16px',
        background: 'linear-gradient(135deg, #f1f5f9 0%, #93c5fd 45%, #c4b5fd 100%)',
        backgroundSize: '200% 200%',
        animation: 'gradShift 5s ease infinite, fadeInUp 0.55s .12s both',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        3D Squat Form<br />Correction
      </h1>

      {/* Subtitle */}
      <p className="fade-in-up-d2" style={{
        fontSize: 16, color: '#64748b',
        textAlign: 'center', maxWidth: 440,
        lineHeight: 1.6, marginBottom: 36,
      }}>
        {liveConnected
          ? 'Camera is active. Step into position and perform a squat — analysis starts automatically.'
          : 'Stand in front of the depth camera, perform a squat, and get instant 3D posture feedback with joint-level heatmap highlighting.'
        }
      </p>

      {/* Feature grid */}
      <div className="fade-in-up-d3" style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 10, marginBottom: 40, width: '100%', maxWidth: 560,
      }}>
        {FEATURES.map(f => (
          <div key={f.label} style={{
            background: 'rgba(10,14,40,0.7)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(59,130,246,0.12)',
            borderRadius: 14, padding: '16px 10px',
            textAlign: 'center',
            transition: 'border-color 0.3s, box-shadow 0.3s',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(59,130,246,0.12)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(59,130,246,0.12)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>{f.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 2 }}>{f.label}</div>
            <div style={{ fontSize: 11, color: '#475569' }}>{f.sub}</div>
          </div>
        ))}
      </div>

      {/* Mode buttons */}
      <div className="fade-in-up-d4" style={{ display: 'flex', gap: 14, width: '100%', maxWidth: 520 }}>

        {/* Live Session */}
        <button
          className="btn-glow"
          onClick={() => onMode('live')}
          style={{
            flex: 1, padding: '20px 16px',
            background: liveConnected
              ? 'linear-gradient(135deg, #0891b2 0%, #2563eb 100%)'
              : 'rgba(30,41,59,0.8)',
            color: liveConnected ? '#fff' : '#475569',
            border: liveConnected
              ? 'none'
              : '1.5px solid rgba(34,211,238,0.2)',
            borderRadius: 16, cursor: 'pointer',
            position: 'relative', overflow: 'hidden',
            transition: 'transform 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1.03)'}
        >
          {liveConnected && (
            <span style={{
              position: 'absolute', top: 0, left: '-100%', width: '60%', height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
              animation: 'shimmer 2.4s ease-in-out infinite', pointerEvents: 'none',
            }} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: liveConnected ? '#22d3ee' : '#334155',
              boxShadow: liveConnected ? '0 0 8px #22d3ee' : 'none',
              animation: liveConnected ? 'pulse 1.5s ease-in-out infinite' : 'none',
            }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', opacity: 0.8 }}>
              {liveConnected ? 'CAMERA ACTIVE' : 'CAMERA OFFLINE'}
            </span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.02em' }}>
            Live Session
          </div>
          <div style={{ fontSize: 11, marginTop: 4, opacity: 0.65 }}>
            Squat to auto-analyze
          </div>
        </button>

        {/* Saved Reps */}
        <button
          onClick={() => onMode('batch')}
          style={{
            flex: 1, padding: '20px 16px',
            background: 'rgba(15,23,42,0.7)',
            color: '#94a3b8',
            border: '1.5px solid rgba(255,255,255,0.08)',
            borderRadius: 16, cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'transform 0.15s, border-color 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.03)';
            e.currentTarget.style.borderColor = 'rgba(148,163,184,0.2)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1.03)'}
        >
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6, opacity: 0.6 }}>
            BROWSE EXISTING
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.02em' }}>
            Saved Reps
          </div>
          <div style={{ fontSize: 11, marginTop: 4, opacity: 0.5 }}>
            Pick and replay any recorded rep
          </div>
        </button>
      </div>

      <p className="fade-in-up-d4" style={{ marginTop: 14, fontSize: 12, color: '#1e293b' }}>
        No account · No data stored
      </p>
    </div>
  );
}
