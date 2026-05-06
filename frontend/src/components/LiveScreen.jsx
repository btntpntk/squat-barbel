import { useState } from 'react';
import { getLiveFeedUrl } from '../services/apiClient';

function CameraFeed({ label, view }) {
  const [missing, setMissing] = useState(false);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: '#475569',
      }}>
        {label}
      </div>
      {missing ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 10,
          background: 'rgba(10,14,40,0.6)', borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ fontSize: 28, opacity: 0.3 }}>□</div>
          <span style={{ fontSize: 12, color: '#334155' }}>Camera not active</span>
          <span style={{ fontSize: 11, color: '#1e293b' }}>Run capture/F_main.py</span>
        </div>
      ) : (
        <img
          src={getLiveFeedUrl(view)}
          alt={label}
          onError={() => setMissing(true)}
          style={{
            flex: 1, width: '100%', minHeight: 0,
            objectFit: 'contain', borderRadius: 12,
            background: '#000',
            border: '1px solid rgba(255,255,255,0.04)',
          }}
        />
      )}
    </div>
  );
}

export function LiveScreen({ onBack }) {
  return (
    <div className="fade-in-up" style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: 16, gap: 12, overflow: 'hidden',
    }}>

      {/* Status bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 18px', flexShrink: 0,
        background: 'rgba(5,8,28,0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(34,211,238,0.2)',
        borderRadius: 12,
      }}>
        <div style={{
          width: 9, height: 9, borderRadius: '50%',
          background: '#22d3ee',
          boxShadow: '0 0 12px #22d3ee',
          animation: 'pulse 1.5s ease-in-out infinite',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 14, fontWeight: 800, color: '#67e8f9', letterSpacing: '0.04em' }}>
          LIVE
        </span>
        <span style={{ fontSize: 13, color: '#475569' }}>
          Waiting for squat — rep detection is active
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={onBack}
          style={{
            padding: '6px 16px', borderRadius: 8, cursor: 'pointer',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#475569', fontSize: 12, fontWeight: 600,
          }}
        >
          ← Back
        </button>
      </div>

      {/* Camera feeds */}
      <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0 }}>
        <CameraFeed label="Front camera (RealSense)" view="front" />
        <CameraFeed label="Side camera (Camo)" view="side" />
      </div>

      {/* Instruction footer */}
      <div style={{
        padding: '12px 18px', flexShrink: 0, textAlign: 'center',
        background: 'rgba(10,14,40,0.5)',
        border: '1px solid rgba(59,130,246,0.1)',
        borderRadius: 10, fontSize: 13, color: '#475569', lineHeight: 1.6,
      }}>
        Stand in front of the cameras and perform a squat.
        Analysis will start automatically when the rep is detected.
      </div>
    </div>
  );
}
