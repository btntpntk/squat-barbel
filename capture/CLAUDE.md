# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Barbel is a fitness pose-data collection system. It captures synchronized video from an Intel RealSense depth camera (front view) and a Camo virtual camera (side view, routed from an iPhone via Camo Studio), runs MediaPipe pose estimation on the RealSense color stream, detects repetitions automatically, and saves per-rep video clips plus JSON landmark sequences.

## Running the Project

All commands assume the `.venv` is activated (`source .venv/Scripts/activate` on Windows bash).

```bash
# Main collection app
python F_main.py

# Replay a recorded rep
python F_viewer.py SESS-0001_rep1
python F_viewer.py SESS-0001_rep1 --output-dir path/to/output --fps 30

# Test the side camera in isolation
python test.py
```

There are no build steps, linters, or test suites configured.

## Architecture

The pipeline is a producer-consumer chain where every hardware source runs on its own background thread and deposits frames into a small `deque(maxlen=2)`. The main loop polls `.get_latest()` on each source.

```
RealSenseCamera (thread)  →  deque  ─┐
SideCamera      (thread)  →  deque  ─┤
                                      └─► F_main.py main loop
                                              │
                                    PoseEstimator.process()
                                    PoseEstimator.extract_landmarks()
                                              │
                                    RepDetector.feed()  ──► _on_rep() callback
                                              │
                                    SessionRecorder.write_frames()
                                    SessionRecorder.add_landmarks()
                                              │
                                    composite_frame() → cv2.imshow()
```

`SessionRecorder` writes video via `_AsyncVideoWriter`, which queues frames to a per-file background thread so disk I/O never stalls the main loop. In-flight files are named `*_tmp.mp4` and renamed on flush.

## Key Files

| File | Role |
|---|---|
| `F_main.py` | Entry point and main loop; owns keyboard controls |
| `F_config.py` | All tunable parameters as dataclasses (`AppConfig` nests all others) |
| `F_camera.py` | RealSense pipeline; does `hardware_reset()` on startup (adds ~2 s delay) |
| `F_side_camera.py` | Camo camera via DirectShow; discovery runs in `__init__` before RealSense starts |
| `F_pose.py` | MediaPipe Pose wrapper; vectorised depth lookup via `rs.rs2_deproject_pixel_to_point` |
| `F_rep_detector.py` | Two-phase TRAVEL→CONFIRM peak detector; fires callback when rep peak is confirmed |
| `F_recorder.py` | Session/rep lifecycle; async video writers; JSON pose-sequence output |
| `F_visualizer.py` | 2-D skeleton overlay, off-screen matplotlib 3-D render, `composite_frame()` 2×2 grid |
| `F_viewer.py` | Standalone playback tool; adds wrist trail and velocity graph |

## Configuration (`F_config.py`)

Change parameters here rather than in the source files:

- `SideCameraConfig.keyword` — substring matched against DirectShow device name to find the side camera (default `"Camo"`). Falls back to `index` if `pygrabber` is not installed or no match is found.
- `SideCameraConfig.index` — fallback DirectShow index if name discovery fails (default `4`).
- `RepDetectorConfig` — all rep-detection thresholds: `landmark_index` (default 16 = RIGHT_WRIST), `axis` (`"y_norm"`), `amplitude_threshold`, `return_ratio`, `peak_travel_dir` (`-1` = local min = top of a curl).

## Side Camera Discovery

`SideCamera.__init__` calls `_discover_side_camera()` immediately — before `RealSenseCamera.start()` — because the RealSense `hardware_reset()` temporarily unsettles the Windows DirectShow device list. The function uses `pygrabber.dshow_graph.FilterGraph` to enumerate devices, skips anything whose name contains `"intel"`, `"realsense"`, or `"depth"`, and matches the remainder against `SideCameraConfig.keyword`. Install pygrabber with `pip install pygrabber`.

## Output Structure

```
output/
  pose-seq/    SESS-XXXX_repN.json
  video/       SESS-XXXX_repN.mp4        (RealSense color, front view)
  video-side/  SESS-XXXX_repN.mp4        (Camo, side view)
```

Session IDs auto-increment by scanning existing filenames. In-flight files are `*_tmp.mp4` until the rep boundary flush renames them.

### JSON schema (`pose-seq/*.json`)

```json
{
  "session_id": "SESS-0001",
  "rep": 1,
  "timestamp": "2026-05-06T12:00:00",
  "frame_count": 142,
  "pose_sequence": [
    [
      {
        "index": 0,
        "x_norm": 0.51, "y_norm": 0.23, "z_mp": -0.12,
        "x_3d": 0.04, "y_3d": -0.18, "z_3d": 1.42,
        "visibility": 0.99
      },
      ...
    ],
    ...
  ]
}
```

`x_3d/y_3d/z_3d` are `null` when the landmark's visibility is below `PoseConfig.visibility_threshold` or depth is zero. `z_mp` is MediaPipe's own depth estimate (not metric).

## Display Layout

`composite_frame()` assembles a 2×2 grid at 640×480 per cell:

```
┌─────────────────┬─────────────────┐
│  RealSense RGB  │  3D skeleton    │
│  + skeleton     │  (matplotlib)   │
├─────────────────┼─────────────────┤
│  Side camera    │  Info / HUD     │
│  (Camo)         │  panel          │
└─────────────────┴─────────────────┘
```

## Runtime Controls (`F_main.py`)

| Key | Action |
|---|---|
| `s` | Start / end session |
| `p` | Manual rep split (only during session) |
| `q` | Quit |

Rep splits also fire automatically via `RepDetector` callback → `recorder.end_rep()`.
