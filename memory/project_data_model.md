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

**API wire format** (`GET /reps/{id}/pose`) uses `_meters` suffix and **also includes `x_norm`/`y_norm`**:
```json
{ "index": 0, "x_3d_meters": 0.04, "y_3d_meters": -0.18, "z_3d_meters": 1.42,
  "x_norm": 0.51, "y_norm": 0.23, "visibility": 0.99 }
```

`app/services/rep_store.py::get_pose()` performs the rename and passes through `x_norm`/`y_norm`. The frontend uses `x_3d_meters` when available; falls back to `x_norm`/`y_norm` with `tz=0` (flat skeleton) when 3D coords are null.

`x_3d`, `y_3d`, `z_3d` are `null` when `visibility <= threshold` or depth pixel is zero. The API schema and frontend both handle `null`.

**+Y is DOWN** in both coordinate systems (MediaPipe convention). The frontend negates Y, Z, **and X** when converting to Three.js space. X is negated to match `F_visualizer.py` (`-lm["x_3d"]`) so the person faces the viewer correctly (person's left on display left).

## Output directories (full)
```
output/
  pose-seq/      SESS-XXXX_repN.json
  video/         SESS-XXXX_repN.mp4    (front, RealSense)
  video-side/    SESS-XXXX_repN.mp4    (side, Camo)
  live/          front.jpg, side.jpg   (latest frame, written by F_main.py every 3 frames; served as MJPEG by backend)
```

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
