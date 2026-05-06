# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

**SquatBarbel** is a three-component system:

1. **Camera & Capture** (`capture/`) — Intel RealSense + iPhone side camera records reps, runs MediaPipe pose estimation, auto-detects reps, and saves per-rep JSON landmark sequences to `output/pose-seq/`.
2. **Analysis API** (`backend/`) — FastAPI server exposes `POST /analyze` and serves rep files. Currently stubs to `generate_mock_response()` — the real AI model is not yet connected.
3. **Kiosk Frontend** (`frontend/`) — React + Three.js web app; user selects a rep, sends its pose sequence to the API, and receives 3D heatmap feedback.

Detailed component docs:
- [`capture/CLAUDE.md`](capture/CLAUDE.md) — camera system architecture, runtime controls, output schema
- [`frontend/CLAUDE.md`](frontend/CLAUDE.md) — frontend screen flow, 3D rendering, mock vs. real API
- [`frontend/API_SPEC.md`](frontend/API_SPEC.md) — `POST /analyze` request/response contract

---

## Commands

### Camera capture system
```bash
# From project root, with root .venv activated:
.venv\Scripts\activate

python capture/F_main.py                      # live capture — s=start, p=rep, q=quit
python capture/F_viewer.py SESS-0001_rep1     # replay a saved rep
python capture/test.py                        # test side camera only
```

### Backend API
```bash
cd backend
venv\Scripts\activate
uvicorn main:app --reload      # → http://localhost:8000
# Swagger UI: http://localhost:8000/docs
# First startup: ~10 s (cache build for 500+ rep files)
```

### Frontend
```bash
cd frontend
npm run dev      # → http://localhost:5173
npm run build
npm run lint
# Run `npm install` once after a fresh clone
```

---

## Directory Structure

```
SquatBarbel/
├── capture/          Camera system (F_*.py, requirements.txt)
├── backend/          FastAPI API server
│   ├── app/
│   │   ├── api/      analyze.py, reps.py, events.py
│   │   ├── core/     config.py  (resolves OUTPUT_DIR, MODEL_PATH)
│   │   ├── models/   schemas.py
│   │   └── services/ rep_store.py, file_watcher.py, mock_analysis.py
│   ├── main.py
│   ├── requirements.txt
│   └── venv/         Python 3.13 (Windows)
├── frontend/         React kiosk
│   ├── src/
│   │   ├── components/
│   │   ├── services/  apiClient.js
│   │   └── utils/
│   └── .env
├── output/           Generated data (gitignored)
│   ├── pose-seq/     SESS-XXXX_repN.json
│   ├── video/        SESS-XXXX_repN.mp4  (front)
│   └── video-side/   SESS-XXXX_repN.mp4  (side)
├── models/           PyTorch .pt files go here (gitignored)
├── memory/           Claude Code cross-session memory
└── .venv/            Camera system Python venv (root)
```

---

## System Data Flow

```
[RealSense Camera + Camo side cam]
      │  capture/F_camera.py / F_side_camera.py
      ▼
[F_pose.py] MediaPipe → 33 joints/frame
      │
[F_rep_detector.py] auto-detect rep boundary
      │
[F_recorder.py] writes:
      ├── output/pose-seq/SESS-XXXX_repN.json   ← landmark data (source of truth)
      ├── output/video/SESS-XXXX_repN.mp4        (front RGB)
      └── output/video-side/SESS-XXXX_repN.mp4  (side Camo)

              ↓  filesystem watch (live mode) or on-demand (batch mode)

[backend/app/services/rep_store.py]
      │  GET /reps, GET /reps/{id}/pose, GET /reps/{id}/video/{view}
      │  GET /events (SSE — pushes new_rep on new file)
      ▼
[frontend RepSelectScreen] plays 12 fps skeleton preview
      │  on "Analyze" or SSE auto-navigate
      ▼
[apiClient.js] POST /analyze  →  backend/main.py
                                      │
                               app/api/analyze.py
                                      │  (stub → generate_mock_response)
                                      ▼
                               AnalyzeResponse { mistakes, confidences,
                                 rule_values, phase_per_frame,
                                 joint_heatmap (frames×36), phases }
      ▼
[AnalysisScreen] → PoseSkeleton + HeatmapOverlay + FeedbackPanel + VideoPlayer×2
```

---

## Coordinate System

The camera system outputs **`x_3d / y_3d / z_3d`** (capture JSON). The API wire format uses **`x_3d_meters / y_3d_meters / z_3d_meters`** — same values, renamed by `rep_store.py::get_pose()`.

**+Y is DOWN** (MediaPipe convention). `PoseSkeleton.jsx` negates Y and Z for Three.js space.

`x_3d / y_3d / z_3d` are `null` when visibility < threshold or depth is zero — both backend and frontend handle nulls.

---

## Two Operating Modes

Set `MODE` in `backend/.env`:

**`live`** — Camera runs concurrently. Backend watches `output/pose-seq/` via `file_watcher.py`. New rep triggers SSE `{type:"new_rep", id:"..."}` → `App.jsx` auto-navigates to `AnalysisScreen`. RepSelectScreen shows current session only (highest SESS number).

**`batch`** — No camera required. Backend reads all of `output/pose-seq/` at startup (cached). RepSelectScreen shows all sessions.

---

## Backend API

| Endpoint | Purpose |
|---|---|
| `GET /reps` | List reps (current session in live, all in batch) |
| `GET /reps/{id}/pose` | Raw pose sequence for one rep (renames `x_3d→x_3d_meters`) |
| `GET /reps/{id}/video/{view}` | Stream `.mp4`/`.avi` with HTTP Range (`view`: `front` or `side`) |
| `GET /events` | SSE stream — `new_rep` events in live mode, `: ping` keepalive every 20 s |
| `POST /analyze` | Analyze pose sequence → heatmap + mistakes (currently mock) |

---

## AI Model — Not Yet Connected

Drop a `.pt` file at `models/squat_model.pt` (controlled by `MODEL_PATH` in `backend/.env`).

To connect it, create `backend/app/services/analysis.py` and replace the stub in `backend/app/api/analyze.py`:

```python
# Replace: raise NotImplementedError
# With:
return run_analysis(request.pose_sequence)
```

Model I/O: input = `pose_sequence` (List[List[JointData]]), output = dict matching `AnalyzeResponse`. See `frontend/API_SPEC.md`. Use `torch.load(path, weights_only=False)` for full-model `.pt` files.

---

## Environment Variables

| File | Variable | Value | Notes |
|---|---|---|---|
| `frontend/.env` | `VITE_API_BASE_URL` | `http://localhost:8000` | |
| `backend/.env` | `FRONTEND_ORIGIN` | `http://localhost:5173` | |
| `backend/.env` | `MODE` | `live` or `batch` | |
| `backend/.env` | `OUTPUT_DIR` | `../output` | Relative to `backend/` |
| `backend/.env` | `MODEL_PATH` | `../models/squat_model.pt` | Relative to `backend/` |

---

## Virtual Joint Indices (heatmap)

`joint_heatmap` has 36 values per frame:
- 0–32: Standard MediaPipe joints
- 33: `mid_hip` (virtual — avg of 23 + 24)
- 34: `mid_shoulder` (virtual — avg of 11 + 12)
- 35: `mid_ear` (virtual — avg of 7 + 8)
