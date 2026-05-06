import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { POSE_CONNECTIONS } from '../utils/poseConnections';
import { severityToColor } from '../utils/heatmapUtils';

// Cyan palette used when no analysis has run yet (preview mode)
const PREVIEW_JOINT = '#22d3ee';
const PREVIEW_LINE  = '#0891b2';

function transformJoints(joints) {
  if (!joints?.length) return [];

  // Prefer metric 3D coords; fall back to normalised 2D when depth is absent.
  // X is negated to match F_visualizer.py (-lm["x_3d"]) so the person faces
  // the viewer correctly (person's left on display left).
  const valid3d = joints.filter(j => j.x_3d_meters != null && j.y_3d_meters != null && j.z_3d_meters != null);
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

  // 2D fallback: x_norm / y_norm are always present, z = 0 (flat skeleton).
  // Negate x for the same left-right orientation as the 3D path.
  const valid2d = joints.filter(j => j.x_norm != null && j.y_norm != null);
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

function JointSphere({ position, severity, color, preview }) {
  const matRef  = useRef();
  const meshRef = useRef();
  const isError = !preview && severity >= 0.51;
  const isWarn  = !preview && severity >= 0.21;

  useFrame(({ clock }) => {
    if (!matRef.current || !meshRef.current || !isError) return;
    const pulse = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 4);
    matRef.current.emissiveIntensity = 0.35 + pulse * 0.85;
    const s = 1 + pulse * 0.18;
    meshRef.current.scale.set(s, s, s);
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[isError ? 0.030 : isWarn ? 0.024 : 0.020, 14, 14]} />
      <meshStandardMaterial
        ref={matRef}
        color={color}
        emissive={color}
        emissiveIntensity={isError ? 0.7 : isWarn ? 0.3 : preview ? 0.25 : 0.08}
        roughness={0.25}
        metalness={0.15}
      />
    </mesh>
  );
}

// previewMode=true → all joints cyan, no pulse, no heatmap coloring
export function PoseSkeleton({ poseFrame, heatmapFrame, previewMode = false }) {
  const joints = useMemo(() => transformJoints(poseFrame), [poseFrame]);
  const map    = useMemo(() => {
    const m = {};
    joints.forEach(j => { m[j.index] = j; });
    return m;
  }, [joints]);

  if (!joints.length) return null;

  return (
    <group>
      {POSE_CONNECTIONS.map(([a, b]) => {
        const ja = map[a]; const jb = map[b];
        if (!ja || !jb) return null;
        // Skip connections where either endpoint has low visibility (matches F_visualizer.py threshold)
        if (Math.min(ja.visibility ?? 1, jb.visibility ?? 1) < 0.4) return null;
        const sev = previewMode ? 0 : Math.max(heatmapFrame?.[a] ?? 0, heatmapFrame?.[b] ?? 0);
        const col = previewMode ? PREVIEW_LINE : severityToColor(sev);
        return (
          <Line key={`${a}-${b}`}
            points={[[ja.tx, ja.ty, ja.tz], [jb.tx, jb.ty, jb.tz]]}
            color={col}
            lineWidth={sev >= 0.51 ? 3.5 : sev >= 0.21 ? 2.5 : 2}
          />
        );
      })}

      {joints.map(j => {
        const sev = previewMode ? 0 : (heatmapFrame?.[j.index] ?? 0);
        const col = previewMode ? PREVIEW_JOINT : severityToColor(sev);
        return (
          <JointSphere
            key={j.index}
            position={[j.tx, j.ty, j.tz]}
            severity={sev}
            color={col}
            preview={previewMode}
          />
        );
      })}
    </group>
  );
}
