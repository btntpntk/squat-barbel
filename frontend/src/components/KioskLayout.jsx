import { BackgroundCanvas } from './BackgroundCanvas';

export function KioskLayout({ children }) {
  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'radial-gradient(ellipse at 20% 0%, #0d1b4a 0%, #060612 55%, #0a0520 100%)',
      color: '#e2e8f0',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* Particle field behind everything */}
      <BackgroundCanvas />

      {/* Subtle top gradient line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.6), rgba(139,92,246,0.4), transparent)',
        zIndex: 10,
      }} />

      {/* Header */}
      <header style={{
        padding: '0 28px', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(6,6,18,0.6)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(59,130,246,0.1)',
        flexShrink: 0, zIndex: 5, position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#3b82f6',
            boxShadow: '0 0 10px #3b82f6, 0 0 20px rgba(59,130,246,0.5)',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          <span style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: '#475569',
          }}>
            Squat Form AI · 3D Analysis
          </span>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, color: '#334155',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 8px #22c55e',
          }} />
          Guest Session
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', position: 'relative', zIndex: 1 }}>
        {children}
      </main>
    </div>
  );
}
