import { getMockAnalysisResult } from './mockData';

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const TIMEOUT_MS = 5000;

function withTimeout(promise, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, timer, promise };
}

export async function fetchReps() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE_URL}/reps`, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function fetchPoseSequence(repId) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(
      `${BASE_URL}/reps/${encodeURIComponent(repId)}/pose`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export function getVideoUrl(repId, view) {
  return `${BASE_URL}/reps/${encodeURIComponent(repId)}/video/${view}`;
}

export async function analyzePosture(poseSequence) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pose_sequence: poseSequence }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch {
    // Backend unavailable — silently fall back to frontend mock
    console.warn('[apiClient] Backend unreachable, using built-in demo data.');
    return getMockAnalysisResult(poseSequence);
  }
}
