const RULE_LABELS = ['Head', 'Hip', 'Frontal Knee', 'Tibial Angle', 'Foot', 'Depth'];
const AI_LABELS   = ['Thoracic', 'Trunk', 'Descent', 'Ascent'];

function calcScore(mistakes, confidences) {
  const base = 100 - mistakes.length * 18;
  const aiPenalty = AI_LABELS.reduce((acc, k) => {
    const v = confidences?.[k] ?? 0;
    return acc + (v > 0.3 ? v * 8 : 0);
  }, 0);
  return Math.max(0, Math.min(100, Math.round(base - aiPenalty)));
}

function getGrade(score) {
  if (score >= 90) return { letter: 'A', color: '#10b981', label: 'Excellent' };
  if (score >= 75) return { letter: 'B', color: '#3b82f6', label: 'Good'      };
  if (score >= 60) return { letter: 'C', color: '#f59e0b', label: 'Fair'      };
  if (score >= 40) return { letter: 'D', color: '#f97316', label: 'Needs Work' };
  return              { letter: 'F', color: '#ef4444', label: 'Critical'   };
}

function ScoreRing({ score, grade }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const fill = circ * (1 - score / 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
      <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
        <svg width="88" height="88" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="44" cy="44" r={r} fill="none" stroke="#1e293b" strokeWidth="7" />
          <circle
            cx="44" cy="44" r={r} fill="none"
            stroke={grade.color} strokeWidth="7"
            strokeDasharray={circ} strokeDashoffset={fill}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${grade.color})`, transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: grade.color, lineHeight: 1 }}>{grade.letter}</span>
          <span style={{ fontSize: 11, color: '#475569' }}>{score}%</span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0' }}>{grade.label}</div>
        <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>Form rating</div>
        <div style={{ fontSize: 11, color: '#334155', marginTop: 6, lineHeight: 1.5 }}>
          {score >= 75 ? 'Great technique overall.' : 'Focus on highlighted areas.'}
        </div>
      </div>
    </div>
  );
}

function Bar({ label, value, active }) {
  const color = value > 0.5 ? '#ef4444' : value > 0.2 ? '#f97316' : '#22c55e';
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: active ? '#e2e8f0' : '#64748b', fontWeight: active ? 600 : 400 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{(value * 100).toFixed(0)}%</span>
      </div>
      <div style={{ height: 5, background: '#0f172a', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${value * 100}%`,
          background: `linear-gradient(90deg, ${color}, ${color}bb)`,
          borderRadius: 3,
          boxShadow: active ? `0 0 10px ${color}` : 'none',
          transition: 'width 0.8s cubic-bezier(.22,1,.36,1)',
        }} />
      </div>
    </div>
  );
}

function RuleRow({ label, rule, isMistake }) {
  const fail = rule.val > rule.threshold;
  const bg   = fail ? 'rgba(239,68,68,0.07)' : 'rgba(34,197,94,0.05)';
  const bd   = fail ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.12)';
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 10px', borderRadius: 8,
      background: bg, border: `1px solid ${bd}`, marginBottom: 5,
    }}>
      <span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>
      <div>
        <span style={{ fontSize: 12, fontWeight: 700, color: fail ? '#ef4444' : '#22c55e' }}>
          {rule.val.toFixed(3)}{rule.unit}
        </span>
        <span style={{ fontSize: 10, color: '#334155', marginLeft: 5 }}>/ {rule.threshold}{rule.unit}</span>
      </div>
    </div>
  );
}

function Sec({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.12em', color: '#334155', marginBottom: 10,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export function FeedbackPanel({ result, userInfo, onReset }) {
  if (!result) return null;
  const { mistakes, confidences, rule_values, phases, phase_per_frame } = result;
  const score = calcScore(mistakes, confidences);
  const grade = getGrade(score);

  const sexLabel = userInfo?.sex ? userInfo.sex.charAt(0).toUpperCase() + userInfo.sex.slice(1) : null;
  const heightLabel = userInfo?.height ? (userInfo.unit === 'metric' ? `${userInfo.height} cm` : `${Math.floor(userInfo.height / 30.48)}'${Math.round((userInfo.height / 2.54) % 12)}"`) : null;
  const weightLabel = userInfo?.weight ? (userInfo.unit === 'metric' ? `${userInfo.weight} kg` : `${Math.round(userInfo.weight * 2.205)} lbs`) : null;
  const userTags = [sexLabel, heightLabel, weightLabel].filter(Boolean);

  return (
    <div className="fade-in-right" style={{
      width: 300, height: '100%',
      background: 'rgba(5,5,18,0.88)',
      backdropFilter: 'blur(16px)',
      borderLeft: '1px solid rgba(59,130,246,0.12)',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0, overflowY: 'auto',
    }}>

      {/* Top header */}
      <div style={{ padding: '16px 18px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0', marginBottom: 2 }}>
          Analysis Results
        </div>
        <div style={{ fontSize: 11, color: '#334155' }}>
          {phase_per_frame?.length ?? 0} frames · BOTTOM frame highlighted
        </div>
        {userTags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {userTags.map(t => (
              <span key={t} style={{
                padding: '2px 8px', background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: 999, fontSize: 10, color: '#64748b',
              }}>{t}</span>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '16px 18px', flex: 1 }}>

        {/* Score ring */}
        <ScoreRing score={score} grade={grade} />

        {/* Mistakes */}
        <Sec title="Detected Issues">
          {mistakes.length === 0
            ? <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 600 }}>✓ No issues detected</span>
            : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {mistakes.map(m => (
                  <span key={m} style={{
                    padding: '4px 12px',
                    background: 'rgba(239,68,68,0.12)',
                    border: '1px solid rgba(239,68,68,0.35)',
                    borderRadius: 999, color: '#f87171', fontSize: 12, fontWeight: 700,
                    boxShadow: '0 0 10px rgba(239,68,68,0.15)',
                  }}>
                    ⚠ {m}
                  </span>
                ))}
              </div>
            )
          }
        </Sec>

        {/* Heatmap legend */}
        <Sec title="Severity Legend">
          <div style={{ display: 'flex', gap: 8 }}>
            {[['#22c55e','Normal','0–20%'],['#f97316','Warning','21–50%'],['#ef4444','Error','51–100%']].map(([c, l, r]) => (
              <div key={l} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: 4, background: c, borderRadius: 2, marginBottom: 4, boxShadow: `0 0 6px ${c}` }} />
                <div style={{ fontSize: 10, color: '#64748b' }}>{l}</div>
                <div style={{ fontSize: 9, color: '#334155' }}>{r}</div>
              </div>
            ))}
          </div>
        </Sec>

        {/* AI confidence */}
        <Sec title="AI Confidence">
          {AI_LABELS.map(k => (
            <Bar key={k} label={k} value={confidences?.[k] ?? 0} active={mistakes.includes(k)} />
          ))}
        </Sec>

        {/* Rule measurements */}
        <Sec title="Rule Measurements">
          {RULE_LABELS.map(k => {
            const rule = rule_values?.[k];
            return rule ? <RuleRow key={k} label={k} rule={rule} isMistake={mistakes.includes(k)} /> : null;
          })}
        </Sec>

        {/* Phase summary */}
        <Sec title="Squat Phases">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {Object.entries(phases ?? {}).map(([ph, val]) => {
              const isBottom = ph === 'BOTTOM';
              return (
                <div key={ph} style={{
                  padding: '4px 9px', borderRadius: 6, fontSize: 10,
                  background: isBottom ? 'rgba(59,130,246,0.18)' : '#0f172a',
                  border: `1px solid ${isBottom ? '#3b82f6' : '#1e293b'}`,
                  color: isBottom ? '#93c5fd' : '#475569',
                  fontWeight: isBottom ? 700 : 400,
                  boxShadow: isBottom ? '0 0 10px rgba(59,130,246,0.2)' : 'none',
                }}>
                  {ph} <span style={{ color: '#334155' }}>{isBottom ? `f${val}` : `×${val}`}</span>
                </div>
              );
            })}
          </div>
        </Sec>
      </div>

      {/* Reset */}
      <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={onReset} style={{
          width: '100%', padding: '11px',
          background: 'rgba(30,42,74,0.8)',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 10, color: '#93c5fd',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          transition: 'background 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.15)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(30,42,74,0.8)'}
        >
          ← New Session
        </button>
      </div>
    </div>
  );
}
