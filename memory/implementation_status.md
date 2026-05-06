---
name: Implementation Status
description: What has been built end-to-end vs. what remains — specifically the AI model stub and Phase 6
type: project
---

## Completed (as of 2026-05-06)

### Backend endpoints
- `GET /reps` — lists reps; live mode = current session only, batch = all 512+
- `GET /reps/{id}/pose` — reads capture JSON, renames `x_3d→x_3d_meters`, returns pose_sequence
- `GET /reps/{id}/video/{view}` — streams `.mp4` / `.avi` with HTTP Range support (`view`: front or side)
- `GET /events` — SSE stream; emits `{"type":"new_rep","id":"SESS-XXXX_repN"}` on new file
- `POST /analyze` — **stub only**, always returns mock (Depth + Trunk mistakes)

### Frontend
- `RepSelectScreen` fetches rep list from `GET /reps`; loads pose on card click; no static JSON imports
- `AnalysisScreen` accepts `repId` prop; shows video playback strip (front + side) below 3D canvas
- `App.jsx` subscribes to `GET /events` SSE; auto-navigates to AnalysisScreen on `new_rep`
- Null-coordinate guard in both `PoseSkeleton.transformJoints` and `AnalysisScreen.deriveTransformed`

### Config & infra
- `frontend/backend/.env` — `MODE`, `OUTPUT_DIR`, `MODEL_PATH`
- `app/core/config.py` — resolves absolute paths from `__file__` anchor (safe from any working dir)
- Backend venv recreated on Python 3.13 Windows (old Mac venv discarded)
- `watchdog` installed

## Not yet done — Phase 6: AI model

The only remaining phase. `app/api/analyze.py` stubs to `generate_mock_response()`.

**To connect the model:**
1. Place `.pt` file at `MODEL_PATH` (default: `<root>/models/squat_model.pt`)
2. Create `app/services/analysis.py` with `load_model(path)` and `run_analysis(pose_sequence)`
3. Call `load_model()` in `main.py` lifespan
4. Replace `raise NotImplementedError` in `analyze.py` with `return run_analysis(request.pose_sequence)`

Model I/O contract: input = `pose_sequence` (List[List[JointData]]), output = dict matching `AnalyzeResponse` fields. See `frontend/API_SPEC.md`.

**Gotcha:** PyTorch may need `weights_only=False` if the `.pt` was saved with `torch.save(model, path)` (full model, not state dict).

## Known limitations / gotchas

- Batch mode startup is slow (~10 s) because it opens all 512 JSON files to read `frame_count`
- Older session videos may be `.avi` (XVID codec) — some browsers won't play them; the `VideoPlayer` component handles this gracefully with a "No video" fallback
- Live mode `GET /reps` always re-scans the directory (no cache) — fast since it's only the current session
- The `GET /events` SSE queue has `maxsize=10`; events beyond that are dropped (single-tab kiosk assumption)
- `npm install` must be run once after a fresh clone before `npm run dev` works
