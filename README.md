# SquatBarbel

A gym kiosk system that captures barbell squats with a depth camera, runs AI pose analysis, and displays 3D heatmap feedback on a web interface.

---

## System Overview

Three components run together on the same Windows machine:

```
[Intel RealSense Camera + iPhone (Camo)]
        ↓  F_main.py
[output/pose-seq/SESS-XXXX_repN.json]
        ↓  GET /reps/{id}/pose
[FastAPI  POST /analyze  →  PyTorch model]
        ↓  joint_heatmap
[React kiosk  →  3D skeleton + heatmap feedback]
```

**Operating modes** (set `MODE` in `frontend/backend/.env`):
- `live` — camera runs concurrently; new reps appear automatically on the kiosk
- `batch` — no camera required; browse all existing reps from `output/pose-seq/`

---

## Requirements

| Component | Requirement |
|---|---|
| Camera system | Python (`.venv` at root), Intel RealSense SDK, Camo Studio |
| Backend API | Python 3.13 (`backend/venv/`) |
| Frontend | Node.js + npm (`frontend/node_modules/`) |

---

## Quick Start

Run each in its own terminal from the project root.

### 1 — Backend API
```
cd backend
venv\Scripts\activate
uvicorn main:app --reload
```
→ `http://localhost:8000` · Swagger docs at `/docs`

> First startup takes ~10 s to scan the rep cache (512+ files).

### 2 — Frontend Kiosk
```
cd frontend
npm run dev
```
→ `http://localhost:5173`

> Run `npm install` once if `node_modules` is missing.

### 3 — Camera Capture (live mode only)
```
.venv\Scripts\activate
python capture/F_main.py
```

| Key | Action |
|---|---|
| `s` | Start / end session |
| `p` | Manual rep split |
| `q` | Quit |

Reps are auto-detected and appear on the kiosk automatically.

---

## Configuration

**`frontend/backend/.env`**
```
FRONTEND_ORIGIN=http://localhost:5173
MODE=live                       # or batch
OUTPUT_DIR=../../output         # relative to frontend/backend/
MODEL_PATH=../../models/squat_model.pt
```

**`frontend/.env`**
```
VITE_API_BASE_URL=http://localhost:8000
```

---

## Output Files

```
output/
  pose-seq/      SESS-XXXX_repN.json   ← landmark data (33 joints × N frames)
  video/         SESS-XXXX_repN.mp4    ← front view (RealSense)
  video-side/    SESS-XXXX_repN.mp4    ← side view (Camo)
```

Session IDs auto-increment. In live mode the kiosk shows only the current (highest-numbered) session.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/reps` | List reps (current session in live, all in batch) |
| `GET` | `/reps/{id}/pose` | Raw pose sequence JSON for one rep |
| `GET` | `/reps/{id}/video/{view}` | Stream MP4 (`view`: `front` or `side`) |
| `GET` | `/events` | SSE stream — pushes `new_rep` events in live mode |
| `POST` | `/analyze` | Analyze pose sequence → heatmap + mistakes |

Full request/response schema: [`frontend/API_SPEC.md`](frontend/API_SPEC.md)

---

## AI Model

Drop a PyTorch `.pt` file at the path set by `MODEL_PATH`. The model receives the same `pose_sequence` JSON as `POST /analyze` and must return the fields defined in `API_SPEC.md`.

Until the model is connected, `POST /analyze` returns a built-in mock response (mistakes: Depth, Trunk).

---

## Project Docs

| File | Contents |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Full architecture, data flow, integration points — for Claude Code |
| [`capture/CLAUDE.md`](capture/CLAUDE.md) | Camera system internals, rep detector, recorder |
| [`frontend/CLAUDE.md`](frontend/CLAUDE.md) | Frontend screen flow, 3D rendering, component responsibilities |
| [`frontend/API_SPEC.md`](frontend/API_SPEC.md) | `POST /analyze` request/response contract |
| [`frontend/FRONT.md`](frontend/FRONT.md) | Frontend stack, CSS, component reference |
