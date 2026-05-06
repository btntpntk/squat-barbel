const FEATURES = [
  { icon: '🎯', label: '33-Joint Tracking',    sub: 'Full body coverage' },
  { icon: '🔥', label: 'Live Heatmap',          sub: 'Error regions in red' },
  { icon: '⚡', label: 'Instant Analysis',      sub: 'Results in seconds' },
  { icon: '🛡️', label: 'No Account Needed',    sub: 'Guest session only' },
];

export function WelcomeScreen({ onStart }) {
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
        Stand in front of the depth camera, perform a squat, and get
        instant 3D posture feedback with joint-level heatmap highlighting.
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

      {/* Start button */}
      <button
        className="btn-glow fade-in-up-d4"
        onClick={onStart}
        style={{
          padding: '18px 56px',
          fontSize: 20, fontWeight: 800,
          background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
          color: '#fff', border: 'none',
          borderRadius: 16, cursor: 'pointer',
          letterSpacing: '0.04em',
          position: 'relative', overflow: 'hidden',
          transition: 'transform 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1.04)'}
      >
        {/* Shimmer sweep */}
        <span style={{
          position: 'absolute', top: 0, left: '-100%', width: '60%', height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
          animation: 'shimmer 2.4s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        Start Guest Session
      </button>

      <p className="fade-in-up-d4" style={{
        marginTop: 16, fontSize: 12, color: '#1e293b',
      }}>
        No account · No data stored · No camera required for demo
      </p>
    </div>
  );
}
