import { Html } from '@react-three/drei';
import { JOINT_NAMES } from '../utils/mediapipeMapping';
import { severityToColor } from '../utils/heatmapUtils';

// Floating labels for joints in error state, positioned in 3D space
export function HeatmapOverlay({ transformedJoints, heatmapFrame }) {
  if (!transformedJoints || !heatmapFrame) return null;

  // Only label joints with severity >= 0.51 (error), limit to avoid clutter
  const errorJoints = transformedJoints
    .filter(j => (heatmapFrame[j.index] ?? 0) >= 0.51)
    .slice(0, 5);

  return (
    <>
      {errorJoints.map(joint => {
        const severity = heatmapFrame[joint.index] ?? 0;
        const color = severityToColor(severity);
        const name = JOINT_NAMES[joint.index] ?? `joint_${joint.index}`;
        return (
          <Html
            key={joint.index}
            position={[joint.tx + 0.08, joint.ty + 0.04, joint.tz]}
            style={{ pointerEvents: 'none' }}
          >
            <div style={{
              background: 'rgba(10,10,26,0.85)',
              border: `1px solid ${color}`,
              borderRadius: 6,
              padding: '3px 8px',
              color,
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              fontFamily: 'system-ui, sans-serif',
              boxShadow: `0 0 8px ${color}40`,
            }}>
              {name.replace(/_/g, ' ')}
            </div>
          </Html>
        );
      })}
    </>
  );
}
