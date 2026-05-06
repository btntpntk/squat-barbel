# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

**SquatBarbel** is a three-component system:

1. **Camera & Capture** (root `F_*.py`) — Intel RealSense + iPhone side camera records reps, runs MediaPipe pose estimation, auto-detects reps, and saves per-rep JSON landmark sequences to `output/pose-seq/`.
2. **Analysis API** (`frontend/backend/`) — FastAPI server exposes `POST /analyze`; currently stubs to `generate_mock_response()`. The real AI model is not yet connected.
3. **Kiosk Frontend** (`frontend/`) — React + Three.js web app; user selects a rep, sends its pose sequence to the API, and receives 3D heatmap feedback.

Detailed component docs live in:
- [`PoseCollection.md`](PoseCollection.md) — camera system architecture, runtime controls, output schema
- [`frontend/CLAUDE.md`](frontend/CLAUDE.md) — frontend screen flow, 3D rendering, mock vs. real API
- [`frontend/API_SPEC.md`](frontend/API_SPEC.md) — `POST /analyze` request/response contract

---

## Commands

### Camera capture system (root venv)
```bash
# Activate venv (Windows)
.venv\Scripts\activate

python F_main.py            # live capture — s=start session, p=manual rep, q=quit
python F_viewer.py SESS-0001_rep1          # replay a saved rep
python test.py              # test side camera only
```

### Backend API
```bash
cd frontend/backend
# Windows: venv\Scripts\activate   |   Mac/Linux: source venv/bin/activate
uvicorn main:app --reload              # → http://localhost:8000
# Swagger UI: http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm run dev      # → http://localhost:5173
npm run build
npm run lint
```

---

## System Data Flow

```
[RealSense Camera]
      │  F_camera.py / F_side_camera.py
      ▼
[F_pose.py] MediaPipe → 33 joints/frame
      │
[F_rep_detector.py] auto-detect rep boundary
      │
[F_recorder.py] writes:
      ├── output/pose-seq/SESS-XXXX_repN.json   ← LANDMARK DATA (source of truth)
      ├── output/video/SESS-XXXX_repN.mp4        (front RGB)
      └── output/video-side/SESS-XXXX_repN.mp4  (side Camo)

              ↓  (rep JSON served to frontend)

[frontend/src/data/rep_0N.json]    currently static ES module imports
      │
[RepSelectScreen] plays 12 fps skeleton preview
      │  on "Analyze"
      ▼
[apiClient.js] POST /analyze  →  frontend/backend/main.py
                                      │
                               app/api/analyze.py
                                      │  (stub — raise NotImplementedError)
                                      ▼
                               mock_analysis.py  generate_mock_response()
                                      │
                               AnalyzeResponse { mistakes, confidences,
                                 rule_values, phase_per_frame,
                                 joint_heatmap (frames×36), phases }
      ▼
[AnalysisScreen] → PoseSkeleton + HeatmapOverlay + FeedbackPanel
```

---

## Coordinate System

The camera system outputs **`x_3d / y_3d / z_3d`** (meters, MediaPipe convention: **+Y is DOWN**).

The API spec uses **`x_3d_meters / y_3d_meters / z_3d_meters`** — these are the same values, just renamed for the wire format (see `frontend/API_SPEC.md`).

`PoseSkeleton.jsx` applies:
```
tx = x_3d_meters − centerX
ty = −(y_3d_meters − centerY)   ← negate for Three.js (+Y up)
tz = −(z_3d_meters − centerZ)   ← negate to face camera
```

Landmark fields in the capture JSON (`pose-seq/*.json`) that map to the API request:
| Capture field | API field |
|---|---|
| `x_3d` | `x_3d_meters` |
| `y_3d` | `y_3d_meters` |
| `z_3d` | `z_3d_meters` |
| `visibility` | `visibility` |

`x_3d / y_3d / z_3d` are `null` when visibility < threshold or depth is zero — the frontend/backend must handle nulls.

---

## Two Operating Modes

The system supports two modes, configurable via `frontend/backend/.env` (`MODE=live` or `MODE=batch`):

### Live Mode
Camera capture runs concurrently on the same machine. The backend watches `output/pose-seq/` for new files written by `F_recorder.py`. When a new `SESS-XXXX_repN.json` appears the backend pushes a notification to the frontend (SSE or WebSocket). The RepSelectScreen shows all reps for the **current session only** (highest SESS-XXXX number in `output/`).

```
F_main.py → F_recorder.py writes output/pose-seq/SESS-XXXX_repN.json
                                    ↓  (filesystem watch)
                           backend detects new file
                                    ↓  SSE / WebSocket push
                           frontend RepSelectScreen updates rep list
```

### Batch Mode
No camera required. The backend reads from `output/pose-seq/` on demand. The RepSelectScreen lists **all** reps across all sessions found in that directory.

---

## Backend Endpoints To Build

The current backend only has `POST /analyze`. The following endpoints are needed:

| Endpoint | Purpose |
|---|---|
| `GET /reps` | List available reps. In Live mode: current session only. In Batch mode: all. Returns `[{id, session, rep_number, frame_count}]`. |
| `GET /reps/{id}/pose` | Return the raw `pose_sequence` JSON for one rep (reads `output/pose-seq/{id}.json`). |
| `GET /reps/{id}/video/{view}` | Stream `.mp4` with HTTP range support. `view` is `front` or `side` (maps to `output/video/` and `output/video-side/`). |
| `GET /events` | SSE stream; emits `{type:"new_rep", id:"SESS-0017_rep3"}` when a new file is detected (Live mode only). |
| `POST /analyze` | Existing — accepts `pose_sequence`, runs PyTorch model, returns heatmap. |

All file paths are **relative to the project root** (`c:\Users\guy\Documents\SquatBarbel\`), which the backend locates via `OUTPUT_DIR` in `frontend/backend/.env`.

---

## AI Model Integration

The `.pt` PyTorch model replaces the `raise NotImplementedError` in `app/api/analyze.py`. Load once at startup (FastAPI `lifespan`), not per-request.

**Model I/O contract** (same as the HTTP contract in `API_SPEC.md`):
- **Input**: `pose_sequence` — the same list-of-frames structure from the `POST /analyze` request body
- **Output**: the full `AnalyzeResponse` fields — `mistakes`, `confidences`, `rule_values`, `phase_per_frame`, `joint_heatmap`, `phases`

```python
# app/services/analysis.py  (to create)
import torch

_model = None

def load_model(path: str):
    global _model
    _model = torch.load(path, map_location="cpu")
    _model.eval()

def run_analysis(pose_sequence) -> AnalyzeResponse:
    # feed pose_sequence JSON directly to model
    # model returns dict matching AnalyzeResponse fields
    with torch.no_grad():
        result = _model(pose_sequence)
    return AnalyzeResponse(**result)
```

Set `MODEL_PATH` in `frontend/backend/.env`. The model path should point to the `.pt` file in the project root or a `models/` subfolder.

## Live Mode Auto-Analysis Flow

When a new rep is detected in Live mode, the frontend skips the RepSelectScreen and jumps straight to analysis:

```
SSE event {type:"new_rep", id:"SESS-0017_rep3"}
        ↓
frontend auto-navigates to AnalysisScreen
        ↓  (shows "Analyzing Squat..." spinner — 3.2 s minimum delay already in AnalysisScreen)
GET /reps/{id}/pose   ← fetch the pose_sequence
        ↓
POST /analyze          ← send to model
        ↓
render 3D heatmap + FeedbackPanel
```

The `AnalysisScreen` already handles the loading state and minimum-delay UX pattern — no changes needed there. The SSE event + auto-navigate logic belongs in `App.jsx`.

## Video Playback

Video playback is a **section within `AnalysisScreen`** alongside the existing 3D view (not a new screen). The backend streams the `.mp4` with HTTP `Range` header support so the browser `<video>` element can seek. Two video players side by side: front view (`output/video/`) and side view (`output/video-side/`).

Endpoint: `GET /reps/{id}/video/{view}` where `view` is `front` or `side`.

## What Is Not Yet Implemented

- All new backend endpoints listed above
- PyTorch model loading and inference in `app/api/analyze.py`
- Filesystem watcher for Live mode SSE (`GET /events`)
- HTTP range-request video streaming
- Video playback section in `AnalysisScreen`
- Frontend SSE subscription + auto-navigate in `App.jsx`
- Frontend rep list fetched from API (currently static `rep_01.json` / `rep_02.json` imports in `RepSelectScreen.jsx`)

---

## Plugging In the Real Analysis Model

In [`frontend/backend/app/api/analyze.py`](frontend/backend/app/api/analyze.py), replace the stub:

```python
# Before (stub):
raise NotImplementedError

# After: call your model/service here
result = my_analysis_service.analyze(request.pose_sequence)
return result
```

The `generate_mock_response()` fallback always returns `mistakes=["Depth","Trunk"]` with a heatmap that peaks at `n_frames // 2`. The 10-label order is fixed: Head, Hip, Frontal Knee, Tibial Angle, Foot, Depth, Thoracic, Trunk, Descent, Ascent.

---

## Environment Variables

| File | Variable | Default | Notes |
|---|---|---|---|
| `frontend/.env` | `VITE_API_BASE_URL` | `http://localhost:8000` | |
| `frontend/backend/.env` | `FRONTEND_ORIGIN` | `http://localhost:5173` | |
| `frontend/backend/.env` | `MODE` | `live` | `live` or `batch` |
| `frontend/backend/.env` | `OUTPUT_DIR` | `../../output` | Relative to `frontend/backend/`; resolves to root `output/` |
| `frontend/backend/.env` | `MODEL_PATH` | `../../models/squat_model.pt` | Path to the PyTorch `.pt` file |

---

## Virtual Joint Indices (heatmap)

`joint_heatmap` has 36 values per frame (not 33):
- 0–32: Standard MediaPipe joints
- 33: `mid_hip` (virtual — average of 23 + 24)
- 34: `mid_shoulder` (virtual — average of 11 + 12)
- 35: `mid_ear` (virtual — average of 7 + 8)
