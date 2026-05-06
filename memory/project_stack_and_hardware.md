---
name: Stack and Hardware
description: Full stack for all three components — camera system, FastAPI backend, React frontend — plus hardware and venv locations
type: project
---

## Hardware
- **Front camera:** Intel RealSense depth camera (USB). Hardware-reset on startup adds ~2 s delay.
- **Side camera:** iPhone via Camo Studio → Windows DirectShow virtual device. Discovered by name substring match (`"Camo"`); fallback to index 4.

## Venv locations (do not confuse)
| Component | Venv path | Python |
|---|---|---|
| Camera system | `<root>/.venv/` | system Python + mediapipe/pyrealsense2 |
| Backend API | `frontend/backend/venv/` | **Python 3.13, Windows** |
| Frontend | `frontend/node_modules/` | Node.js / npm |

The `frontend/backend/venv/` was recreated on 2026-05-06 — the original was built on a Mac (Python 3.14, Homebrew paths) and was not usable on Windows.

## Camera system Python deps (root `.venv`)
`pyrealsense2`, `mediapipe`, `opencv-python`, `numpy`, `matplotlib`

Camera config: 640×480 @ 60 fps, color BGR8, depth Z16, aligned to color stream.
Video codec: XVID in `.mp4` (non-standard; use VLC if browser won't play older files).

## Backend API (`frontend/backend/venv/`, Python 3.13)
`fastapi`, `uvicorn[standard]`, `pydantic`, `python-dotenv`, `watchdog`

- Port: 8000
- First startup: ~10 s (builds frame-count cache for 512+ reps by opening each JSON)
- `MODE=live` starts a watchdog filesystem observer on `output/pose-seq/`
- AI model (PyTorch `.pt`): **not yet connected** — `POST /analyze` returns mock data

## Frontend (`frontend/node_modules/`)
React 19, Vite 7, Three.js 0.184, React Three Fiber 9, Drei 10

- Port: 5173
- Run `npm install` once if `node_modules` is missing (e.g. fresh clone)
- All styles inline CSS — no CSS framework
- No global state library — props flow down from `App.jsx`
