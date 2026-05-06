---
name: Barbel Project Overview
description: Full-stack squat analysis kiosk — camera capture (root F_*.py), FastAPI backend (frontend/backend/), React kiosk frontend (frontend/)
type: project
---

**SquatBarbel** is a three-component local system for barbell squat form analysis.

**Why:** Gym kiosk — user performs a squat in front of a depth camera, system auto-detects the rep, runs AI analysis, and shows 3D heatmap feedback on a React kiosk UI.

**How to apply:** All three components run on the same machine. Keep the SESS-XXXX session ID scheme and output directory layout intact — the backend reads from `output/` directly.

## Components

### 1. Camera & Capture (`capture/`)
- RealSense front camera + iPhone via Camo (side camera)
- MediaPipe pose estimation → 33 joints/frame
- Auto rep detection → saves `output/pose-seq/SESS-XXXX_repN.json` + `output/video/` + `output/video-side/`
- Entry: `python capture/F_main.py` (from project root)

### 2. Analysis API (`backend/`)
- FastAPI, Python 3.14, `frontend/backend/venv/`
- Single endpoint `POST /analyze` — currently stubs to `generate_mock_response()`
- AI model: PyTorch `.pt` (not yet loaded)
- Needs new endpoints: `GET /reps`, `GET /reps/{id}/pose`, `GET /reps/{id}/video/{view}`, `GET /events` (SSE)

### 3. Kiosk Frontend (`frontend/`)
- React 19 + Vite 7 + Three.js / R3F / Drei
- Screen flow: welcome → userinfo → repselect → analysis
- Currently uses static `rep_01.json` / `rep_02.json` — needs to read from API

## Operating Modes (to implement)
- **Live**: camera runs concurrently; backend watches `output/pose-seq/` for new files; SSE pushes new-rep events to frontend; RepSelectScreen shows current session only
- **Batch**: no camera; backend reads all of `output/pose-seq/`; user picks any rep

## Key env vars (`frontend/backend/.env`)
- `MODE` = `live` or `batch`
- `OUTPUT_DIR` = `../../output` (relative to `frontend/backend/`)
- `MODEL_PATH` = path to `.pt` file
