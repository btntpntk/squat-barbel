// Severity thresholds from spec:
// 0.00–0.20 = normal (green)
// 0.21–0.50 = warning (orange)
// 0.51–1.00 = error (red)

export function severityToColor(severity) {
  if (severity < 0.21) return '#22c55e';
  if (severity < 0.51) return '#f97316';
  return '#ef4444';
}

export function severityToEmissive(severity) {
  if (severity < 0.21) return '#052e16';
  if (severity < 0.51) return '#431407';
  return '#450a0a';
}

export function severityLabel(severity) {
  if (severity < 0.21) return 'normal';
  if (severity < 0.51) return 'warning';
  return 'error';
}

// BOTTOM phase contains the frame index of the squat apex
export function selectVisualizationFrame(result) {
  const { joint_heatmap, phases, phase_per_frame } = result;

  if (phases?.BOTTOM !== undefined && joint_heatmap[phases.BOTTOM]) {
    return { frameIndex: phases.BOTTOM, heatmapFrame: joint_heatmap[phases.BOTTOM] };
  }

  if (phase_per_frame) {
    const idx = phase_per_frame.indexOf('BOTTOM');
    if (idx !== -1 && joint_heatmap[idx]) {
      return { frameIndex: idx, heatmapFrame: joint_heatmap[idx] };
    }
  }

  // Fall back to worst-average frame
  let maxAvg = -1;
  let worstIdx = 0;
  joint_heatmap.forEach((frame, i) => {
    const avg = frame.reduce((a, b) => a + b, 0) / frame.length;
    if (avg > maxAvg) { maxAvg = avg; worstIdx = i; }
  });
  return { frameIndex: worstIdx, heatmapFrame: joint_heatmap[worstIdx] };
}
