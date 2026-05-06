// Frontend mirror of backend mock — used when the server is unreachable
export function getMockAnalysisResult(poseSequence) {
  const n = poseSequence.length;
  const bottom = Math.floor(n / 2);

  const joint_heatmap = poseSequence.map((_, i) => {
    const frame = new Array(36).fill(0);
    frame[11] = 0.88; frame[12] = 0.88; frame[34] = 0.88;
    const prox = 1.0 - Math.min(1, Math.abs(i - bottom) / Math.max(1, n * 0.4));
    const hip = Math.min(1, prox * 1.1);
    frame[23] = hip; frame[24] = hip; frame[33] = hip;
    frame[25] = Math.min(0.45, prox * 0.5);
    frame[26] = Math.min(0.45, prox * 0.5);
    return frame;
  });

  const phase_per_frame = poseSequence.map((_, i) => {
    if (i < 2) return 'START';
    if (i < bottom) return 'DESCENT';
    if (i === bottom) return 'BOTTOM';
    if (i < n - 2) return 'ASCENT';
    return 'FINISH';
  });

  return {
    mistakes: ['Depth', 'Trunk'],
    confidences: {
      Head: 0.0, Hip: 0.0, 'Frontal Knee': 0.0,
      'Tibial Angle': 0.0, Foot: 0.0, Depth: 1.0,
      Thoracic: 0.12, Trunk: 0.88, Descent: 0.05, Ascent: 0.02,
    },
    rule_values: {
      Head: { val: 4.2, threshold: 15.0, unit: '°' },
      Hip: { val: 0.012, threshold: 0.05, unit: 'm' },
      'Frontal Knee': { val: 0.008, threshold: 0.02, unit: 'm' },
      'Tibial Angle': { val: 3.5, threshold: 10.0, unit: '°' },
      Foot: { val: 0.002, threshold: 0.02, unit: 'm' },
      Depth: { val: 0.115, threshold: 0.05, unit: 'm' },
    },
    phase_per_frame,
    joint_heatmap,
    phases: {
      START: 2,
      DESCENT: Math.max(1, bottom - 2),
      BOTTOM: bottom,
      ASCENT: Math.max(1, n - bottom - 3),
      FINISH: 2,
    },
  };
}
