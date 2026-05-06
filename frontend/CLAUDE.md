# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend
```bash
npm run dev          # dev server → http://localhost:5173
npm run build        # production build to dist/
npm run lint         # ESLint check
npm run preview      # preview production build locally
```

### Backend (run from project root)
```bash
cd backend
venv\Scripts\activate
uvicorn main:app --reload          # dev server → http://localhost:8000
```

API docs auto-generated at `http://localhost:8000/docs`.

## Environment Variables

| File | Key | Default |
|---|---|---|
| `.env` (frontend) | `VITE_API_BASE_URL` | `http://localhost:8000` |
| `backend/.env` | `FRONTEND_ORIGIN` | `http://localhost:5173` |

## Architecture

### Screen flow (App.jsx)
```
welcome → userinfo → repselect → analysis
```
State lives in `App.jsx`: `screen`, `userInfo` (sex/height/weight/unit), `repData` (poseSequence + metadata + repLabel). Passed down as props — no global state library.

### Frontend data pipeline
1. `RepSelectScreen` loads `rep_01.json` / `rep_02.json` directly as ES module imports, plays skeleton animation at 12 fps via `setInterval`.
2. On "Analyze", `poseSequence` is passed to `AnalysisScreen` (falls back to `src/data/samplePose.js` if null).
3. `AnalysisScreen` calls `analyzePosture()` from `apiClient.js`, which has a 5 s timeout and **silently falls back** to `mockData.js` if the backend is unreachable — the UI never shows an error.
4. Result `joint_heatmap` is a `(frames, 36)` array. `selectVisualizationFrame()` (heatmapUtils) picks the BOTTOM phase frame index (or worst-average frame as fallback).
5. The chosen frame's heatmap row drives all coloring in `PoseSkeleton`.

### 3D rendering
`HumanModel` wraps `PoseSkeleton` in an `ErrorBoundary + Suspense`. It first tries to load `/models/human-model.glb` via `useGLTF`. If the file is absent (404) the error boundary silently renders `PoseSkeleton` instead.

`PoseSkeleton` transforms MediaPipe coords → Three.js space (center bounding box, negate Y and Z). Joints are spheres; connections are Drei `<Line>`. Both are colored by `severityToColor()`:
- `< 0.21` → green `#22c55e`
- `0.21–0.50` → orange `#f97316`
- `≥ 0.51` → red `#ef4444` (also pulses via `useFrame`)

Pass `previewMode={true}` to render all joints cyan (`#22d3ee`) without pulsing — used in RepSelectScreen before analysis.

`joint_heatmap` indices 0–32 are standard MediaPipe joints; 33 = mid-hip, 34 = mid-shoulder, 35 = mid-ear (virtual nodes, backend only).

### Backend
Single endpoint `POST /analyze`. The real analysis service is not connected — `analyze.py` always raises `NotImplementedError` and falls into `generate_mock_response()`. To plug in a real service, replace the `raise NotImplementedError` line.

Mock always returns mistakes `["Depth", "Trunk"]` with heatmap severity peaking at the mid-sequence frame (treated as squat bottom). The 10 label order matches the JSON ground-truth labels: Head, Hip, Frontal Knee, Tibial Angle, Foot, Depth, Thoracic, Trunk, Descent, Ascent.

### Rep JSON format
Files in `src/data/rep_*.json`:
```json
{
  "metadata": { "height": "181", "weight": "76", "gender": "Male",
                "subject_id": "...", "rep_number": 2,
                "label": ["True","False",...] },
  "pose_sequence": [ [{ "index":0, "x_3d_meters":..., "y_3d_meters":...,
                         "z_3d_meters":..., "visibility":... }, ...33 joints], ...frames ]
}
```
`label` is a 10-element array of `"True"/"False"` strings (pass/fail per rule, in the order above). `x_2d_normalized`, `y_2d_normalized`, `z_estimated_mediapipe` fields are present but not used by the frontend.

## Key constraints
- **+Y is DOWN** in the input coordinate system (MediaPipe convention). The frontend negates Y when converting to Three.js space.
- No database, no auth, no persistent storage — guest session only.
- GLB model slot: drop a file at `public/models/human-model.glb` and the app uses it automatically.
