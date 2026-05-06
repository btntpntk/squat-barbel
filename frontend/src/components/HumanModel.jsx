import { Suspense, Component } from 'react';
import { useGLTF } from '@react-three/drei';
import { PoseSkeleton } from './PoseSkeleton';

const MODEL_PATH = '/models/human-model.glb';

function GLBModelInner({ heatmapFrame }) {
  const { scene } = useGLTF(MODEL_PATH);
  return (
    <primitive
      object={scene}
      scale={[1, 1, 1]}
      position={[0, -0.9, 0]}
    />
  );
}

class GLBErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export function HumanModel({ poseFrame, heatmapFrame, transformedJoints }) {
  const skeletonFallback = (
    <PoseSkeleton poseFrame={poseFrame} heatmapFrame={heatmapFrame} />
  );

  return (
    <GLBErrorBoundary fallback={skeletonFallback}>
      <Suspense fallback={skeletonFallback}>
        <GLBModelInner heatmapFrame={heatmapFrame} />
      </Suspense>
    </GLBErrorBoundary>
  );
}
