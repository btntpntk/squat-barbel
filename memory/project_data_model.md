---
name: Barbel Data Model and Output Structure
description: Session IDs, output directories, JSON field names (capture vs API), rep_store rename, and keyboard controls
type: project
---

## Session ID format
`SESS-XXXX` — 4-digit zero-padded, auto-incremented by scanning `output/pose-seq/` and `output/video/`.

## Output directories (relative to project root)
```
output/
  pose-seq/      SESS-XXXX_repN.json
  video/         SESS-XXXX_repN.mp4    (front, RealSense)
  video-side/    SESS-XXXX_repN.mp4    (side, Camo)
```

## CRITICAL: Field name difference — capture vs API

**Capture JSON** (`output/pose-seq/*.json`) uses short names:
```json
{ "index": 0, "x_3d": 0.04, "y_3d": -0.18, "z_3d": 1.42, "visibility": 0.99,
  "x_norm": 0.51, "y_norm": 0.23, "z_mp": -0.12 }
```

**API wire format** (`POST /analyze`, `GET /reps/{id}/pose`) uses `_meters` suffix:
```json
{ "index": 0, "x_3d_meters": 0.04, "y_3d_meters": -0.18, "z_3d_meters": 1.42, "visibility": 0.99 }
```

`app/services/rep_store.py::get_pose()` performs the rename when reading from disk. All other backend and frontend code uses `x_3d_meters` / `y_3d_meters` / `z_3d_meters`.

`x_3d`, `y_3d`, `z_3d` are `null` when `visibility <= threshold` or depth pixel is zero. The API schema and frontend both handle `null`.

**+Y is DOWN** in both coordinate systems (MediaPipe convention). The frontend negates Y and Z when converting to Three.js space.

## Capture JSON full schema
```json
{
  "session_id": "SESS-0130",
  "rep": 1,
  "timestamp": "2026-05-06T12:00:00",
  "frame_count": 42,
  "pose_sequence": [
    [ { "index": 0..32, "x_3d": float|null, "y_3d": float|null, "z_3d": float|null,
        "x_norm": float, "y_norm": float, "z_mp": float, "visibility": float }, ...33 joints ],
    ...N frames
  ]
}
```

## Keyboard controls (F_main.py)
| Key | Action |
|---|---|
| `s` | Start / end session |
| `p` | Manual rep split |
| `q` | Quit |
