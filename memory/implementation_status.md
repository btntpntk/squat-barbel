---
name: Implementation Status
description: What has been built end-to-end vs. what remains — AI model Phase 6, plus all session-2 additions
type: project
---

## Completed (updated 2026-05-06)

### Backend endpoints
- `GET /reps?scope=all` — `scope=all` forces batch (all sessions) regardless of backend MODE
- `GET /reps/{id}/pose` — reads capture JSON, renames `x_3d→x_3d_meters`; **now also passes `x_norm` and `y_norm`** (used by frontend 2D fallback)
- `GET /reps/{id}/video/{view}` — HTTP Range streaming for front/side MP4
- `GET /events` — SSE; reconnect-safe on client; emits `{"type":"new_rep","id":"..."}` and `{"type":"connected"}` handshake
- `GET /live-feed/{view}` — MJPEG stream (`multipart/x-mixed-replace`) from `output/live/{view}.jpg`; creates `output/live/` at import time
- `POST /analyze` — **stub only**, always returns mock (Depth + Trunk mistakes)

### Frontend screens and flow
- **Welcome screen** — two buttons: **Live Session** (→ LiveScreen) and **Saved Reps** (→ RepSelectScreen with `scope=all`)
- **LiveScreen** — shows MJPEG feeds from `/live-feed/front` and `/live-feed/side` while waiting for a squat; "Camera not active" placeholder when capture isn't running
- **RepSelectScreen** — accepts `scope` prop; `scope="all"` fetches all reps across all sessions
- **AnalysisScreen** — 3D skeleton + heatmap + video strip (front + side)
- `App.jsx` SSE auto-reconnects on error (3 s retry); `modeRef` gates auto-navigate to analysis for live mode only; `liveConnected` state drives header indicator and welcome button style

### Skeleton rendering
- **POSE_CONNECTIONS** — 35 edges matching `mp.solutions.pose.POSE_CONNECTIONS` exactly (was 22, had wrong face entries)
- **X-axis negated** in both `PoseSkeleton.transformJoints` and `AnalysisScreen.deriveTransformed` to match `F_visualizer.py` (`-lm["x_3d"]`); person faces viewer correctly
- **Visibility filter** — connections with `min(visibility_a, visibility_b) < 0.4` are skipped (matches Python viewer threshold)
- **2D fallback** — when all `x_3d_meters` are null (low-visibility joints, no depth data), falls back to `x_norm`/`y_norm` with `tz=0`; skeleton always renders

### Capture system
- `F_main.py` writes `output/live/front.jpg` and `output/live/side.jpg` every 3 frames (~20 fps) for the web live feed

### Config & infra
- Backend CORS allows ports 5173 **and** 5174 (Vite sometimes picks 5174 when 5173 is in use)
- Backend venv must be recreated from `backend/` (not copied/moved — `.exe` launchers have hardcoded paths)

## Not yet done — Phase 6: AI model

`app/api/analyze.py` stubs to `generate_mock_response()`.

**To connect the model:**
1. Place `.pt` file at `MODEL_PATH` (default: `<root>/models/squat_model.pt`)
2. Create `app/services/analysis.py` with `load_model(path)` and `run_analysis(pose_sequence)`
3. Call `load_model()` in `main.py` lifespan
4. Replace `raise NotImplementedError` in `analyze.py` with `return run_analysis(request.pose_sequence)`

Input = `pose_sequence` (List[List[JointData]]), output = dict matching `AnalyzeResponse`. See `frontend/API_SPEC.md`.
**Gotcha:** PyTorch may need `weights_only=False` for full-model `.pt` files.

## Known limitations / gotchas

- Batch mode startup is slow (~10 s) — opens all 512+ JSON files to read `frame_count`
- Older videos may be `.avi` (XVID) — `VideoPlayer` shows "No video" fallback for unplayable formats
- `output/live/` is created by the backend at startup; `front.jpg`/`side.jpg` only appear once `F_main.py` is running
- SSE queue `maxsize=10`; events beyond that are dropped (single-tab kiosk assumption)
- `npm install` must be run once after a fresh clone
