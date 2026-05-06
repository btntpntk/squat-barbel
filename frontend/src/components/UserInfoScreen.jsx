import { useState } from 'react';

const SEX_OPTIONS = [
  { value: 'male',   label: 'Male',   icon: '♂' },
  { value: 'female', label: 'Female', icon: '♀' },
  { value: 'other',  label: 'Other',  icon: '⚧' },
];

function GlassCard({ children, style }) {
  return (
    <div style={{
      background: 'rgba(10,14,40,0.75)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: '1px solid rgba(59,130,246,0.18)',
      borderRadius: 24,
      boxShadow: '0 8px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
      ...style,
    }}>
      {children}
    </div>
  );
}

function SliderField({ label, value, min, max, step, onChange, display }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>{label}</span>
        <span style={{
          fontSize: 18, fontWeight: 700, color: '#e2e8f0',
          minWidth: 80, textAlign: 'right',
        }}>
          {display}
        </span>
      </div>
      <div style={{ position: 'relative', height: 6 }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: '#1e293b', borderRadius: 3,
        }} />
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${pct}%`,
          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
          borderRadius: 3,
          boxShadow: '0 0 10px rgba(59,130,246,0.5)',
        }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            opacity: 0, cursor: 'pointer', zIndex: 2,
          }}
        />
        <div style={{
          position: 'absolute', top: '50%', left: `${pct}%`,
          transform: 'translate(-50%, -50%)',
          width: 18, height: 18,
          background: '#3b82f6',
          border: '2px solid #fff',
          borderRadius: '50%',
          boxShadow: '0 0 14px rgba(59,130,246,0.8)',
          pointerEvents: 'none',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 11, color: '#334155' }}>{min}</span>
        <span style={{ fontSize: 11, color: '#334155' }}>{max}</span>
      </div>
    </div>
  );
}

export function UserInfoScreen({ onContinue, onBack }) {
  const [sex, setSex] = useState(null);
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(70);
  const [unit, setUnit] = useState('metric');

  const heightDisplay = unit === 'metric'
    ? `${height} cm`
    : `${Math.floor(height / 30.48)}' ${Math.round((height / 2.54) % 12)}"`;
  const weightDisplay = unit === 'metric'
    ? `${weight} kg`
    : `${Math.round(weight * 2.205)} lbs`;

  const handleContinue = () =>
    onContinue({ sex, height, weight, unit });

  return (
    <div className="fade-in-up" style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, zIndex: 1, position: 'relative',
    }}>
      <GlassCard style={{ width: '100%', maxWidth: 520, padding: '36px 40px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <h2 style={{
            fontSize: 28, fontWeight: 800, margin: 0,
            background: 'linear-gradient(135deg, #e2e8f0, #93c5fd)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            About You
          </h2>
          <p style={{ marginTop: 8, fontSize: 14, color: '#64748b' }}>
            Optional — helps personalize your analysis
          </p>
        </div>

        {/* Sex */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Sex
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {SEX_OPTIONS.map(opt => {
              const active = sex === opt.value;
              return (
                <button key={opt.value} onClick={() => setSex(active ? null : opt.value)}
                  style={{
                    flex: 1, padding: '14px 0', borderRadius: 12, cursor: 'pointer',
                    background: active ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${active ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`,
                    color: active ? '#93c5fd' : '#64748b',
                    fontSize: 13, fontWeight: 700,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    transition: 'all 0.2s',
                    boxShadow: active ? '0 0 20px rgba(59,130,246,0.3)' : 'none',
                  }}>
                  <span style={{ fontSize: 20 }}>{opt.icon}</span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Unit toggle */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <div style={{
            display: 'flex', background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 3,
          }}>
            {['metric', 'imperial'].map(u => (
              <button key={u} onClick={() => setUnit(u)} style={{
                padding: '4px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: unit === u ? '#1e3a8a' : 'transparent',
                color: unit === u ? '#93c5fd' : '#475569',
                fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
                textTransform: 'capitalize',
              }}>
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Height slider */}
        <SliderField
          label="Height"
          value={height}
          min={140} max={220} step={1}
          onChange={setHeight}
          display={heightDisplay}
        />

        {/* Weight slider */}
        <SliderField
          label="Weight"
          value={weight}
          min={40} max={150} step={1}
          onChange={setWeight}
          display={weightDisplay}
        />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button onClick={onBack} style={{
            flex: 1, padding: '14px', borderRadius: 12, cursor: 'pointer',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
            color: '#475569', fontSize: 14, fontWeight: 600,
          }}>
            ← Back
          </button>
          <button
            onClick={handleContinue}
            className="btn-glow"
            style={{
              flex: 2, padding: '14px', borderRadius: 12, cursor: 'pointer',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              border: 'none', color: '#fff', fontSize: 16, fontWeight: 700,
              letterSpacing: '0.02em',
            }}>
            Analyze My Squat →
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: '#334155' }}>
          You can also skip — tap "Analyze" to continue without filling this in
        </p>
      </GlassCard>
    </div>
  );
}
