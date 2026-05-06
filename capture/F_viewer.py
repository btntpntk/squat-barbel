"""
Barbel pose recording viewer.

Usage:
    python F_viewer.py SESS-0001_rep1
    python F_viewer.py SESS-0001_rep1 --output-dir path/to/output

Controls:
    Space       play / pause
    , / .       step back / forward 1 frame
    [ / ]       jump back / forward 10 frames
    r           restart from frame 0
    q           quit
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

# F_visualizer sets Agg backend at import time — must come before pyplot
from F_visualizer import composite_frame, POSE_CONNECTIONS, _LEFT_IDX, _RIGHT_IDX
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D  # noqa: F401

_CELL_H       = 480
_CELL_W       = 640
_TRAIL_LEN    = 30    # how many past frames to show in the trail
_WRIST_IDX    = 16    # right wrist (MediaPipe landmark index)
_VEL_SMOOTH   = 5     # velocity smoothing window (frames)
_PLAYBACK_FPS = 30    # default playback speed


# ---------------------------------------------------------------------------
# 3D viewer — self-contained, adds trail support
# ---------------------------------------------------------------------------

class _Viewer3D:
    """Off-screen 3D skeleton renderer with optional landmark trail."""

    def __init__(self) -> None:
        self._fig = plt.figure(figsize=(6.4, 4.8), dpi=100)
        self._ax  = self._fig.add_subplot(111, projection="3d")
        self._render: Optional[np.ndarray] = None

    def update(
        self,
        landmarks: List[Dict[str, Any]],
        trail: Optional[List[List[Dict[str, Any]]]] = None,
        trail_idx: int = _WRIST_IDX,
    ) -> None:
        ax = self._ax
        ax.clear()

        xs, ys, zs, colors = [], [], [], []
        for lm in landmarks:
            if lm["x_3d"] is None:
                xs.append(np.nan); ys.append(np.nan); zs.append(np.nan)
            else:
                xs.append(-lm["x_3d"])
                ys.append( lm["z_3d"])
                zs.append(-lm["y_3d"])
            idx = lm["index"]
            colors.append(
                "royalblue" if idx in _LEFT_IDX else
                "tomato"    if idx in _RIGHT_IDX else
                "silver"
            )

        ax.scatter(xs, ys, zs, c=colors, s=20, depthshade=False)

        for start, end in POSE_CONNECTIONS:
            if start < len(xs) and end < len(xs):
                alpha = float(np.clip(
                    min(landmarks[start]["visibility"], landmarks[end]["visibility"]),
                    0.15, 0.9,
                ))
                ax.plot(
                    [xs[start], xs[end]],
                    [ys[start], ys[end]],
                    [zs[start], zs[end]],
                    color="steelblue", alpha=alpha, linewidth=1.2,
                )

        # Landmark trail in 3D
        if trail:
            tx, ty, tz = [], [], []
            for frame_lms in trail:
                lm = next((l for l in frame_lms if l["index"] == trail_idx), None)
                if lm and lm.get("x_3d") is not None:
                    tx.append(-lm["x_3d"])
                    ty.append( lm["z_3d"])
                    tz.append(-lm["y_3d"])
            n = len(tx)
            if n > 1:
                alphas = np.linspace(0.05, 0.8, n)
                for i in range(1, n):
                    ax.plot(
                        [tx[i-1], tx[i]], [ty[i-1], ty[i]], [tz[i-1], tz[i]],
                        color="gold", alpha=float(alphas[i]), linewidth=1.8,
                    )
                ax.scatter([tx[-1]], [ty[-1]], [tz[-1]],
                           c="gold", s=35, depthshade=False, zorder=5)

        ax.set_xlabel("X (m)"); ax.set_ylabel("Z (m)"); ax.set_zlabel("Y (m)")
        ax.set_title("3D Skeleton", pad=6)
        ax.set_xlim(-1, 1); ax.set_ylim(1, 3); ax.set_zlim(-1, 1)
        ax.view_init(elev=20, azim=-75)

        self._fig.canvas.draw()
        buf = np.frombuffer(self._fig.canvas.buffer_rgba(), dtype=np.uint8)
        cw, ch = self._fig.canvas.get_width_height()
        self._render = cv2.cvtColor(buf.reshape(ch, cw, 4), cv2.COLOR_RGBA2BGR)

    def get_render(self) -> Optional[np.ndarray]:
        return self._render

    def close(self) -> None:
        plt.close(self._fig)


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_recording(
    name: str, output_dir: Path
) -> Tuple[dict, List[np.ndarray], List[np.ndarray]]:
    json_path  = output_dir / "pose-seq"   / f"{name}.json"
    front_path = output_dir / "video"      / f"{name}.mp4"
    side_path  = output_dir / "video-side" / f"{name}.mp4"

    if not json_path.exists():
        raise FileNotFoundError(f"Pose file not found: {json_path}")

    with open(json_path) as fh:
        data = json.load(fh)

    def _read_all(path: Path) -> List[np.ndarray]:
        if not path.exists():
            return []
        cap = cv2.VideoCapture(str(path))
        frames = []
        while True:
            ret, f = cap.read()
            if not ret:
                break
            frames.append(f)
        cap.release()
        return frames

    front_frames = _read_all(front_path)
    side_frames  = _read_all(side_path)
    return data, front_frames, side_frames


# ---------------------------------------------------------------------------
# Velocity computation
# ---------------------------------------------------------------------------

def compute_velocities(
    pose_seq: List[List[Dict[str, Any]]],
    landmark_idx: int = _WRIST_IDX,
    axis: str = "y_norm",
) -> np.ndarray:
    vals = np.array([
        next(
            (l[axis] for l in frame if l["index"] == landmark_idx and l.get(axis) is not None),
            np.nan,
        )
        for frame in pose_seq
    ], dtype=np.float32)

    vel = np.abs(np.diff(vals, prepend=vals[0]))
    kernel = np.ones(_VEL_SMOOTH, dtype=np.float32) / _VEL_SMOOTH
    return np.convolve(vel, kernel, mode="same")


# ---------------------------------------------------------------------------
# 2D frame rendering
# ---------------------------------------------------------------------------

def draw_skeleton(
    frame: np.ndarray, landmarks: List[Dict[str, Any]]
) -> np.ndarray:
    h, w = frame.shape[:2]
    out  = frame.copy()

    for start_idx, end_idx in POSE_CONNECTIONS:
        s = next((l for l in landmarks if l["index"] == start_idx), None)
        e = next((l for l in landmarks if l["index"] == end_idx),   None)
        if s and e and min(s["visibility"], e["visibility"]) > 0.4:
            x1, y1 = int(s["x_norm"] * w), int(s["y_norm"] * h)
            x2, y2 = int(e["x_norm"] * w), int(e["y_norm"] * h)
            cv2.line(out, (x1, y1), (x2, y2), (0, 200, 100), 2, cv2.LINE_AA)

    for lm in landmarks:
        if lm["visibility"] > 0.4:
            x = int(lm["x_norm"] * w)
            y = int(lm["y_norm"] * h)
            cv2.circle(out, (x, y), 4, (0, 255, 150), -1, cv2.LINE_AA)

    return out


def draw_trail_2d(
    frame: np.ndarray,
    trail: List[List[Dict[str, Any]]],
    landmark_idx: int = _WRIST_IDX,
) -> np.ndarray:
    h, w = frame.shape[:2]
    n    = len(trail)
    if n < 2:
        return frame

    pts: List[Optional[Tuple[int, int]]] = []
    for frame_lms in trail:
        lm = next((l for l in frame_lms if l["index"] == landmark_idx), None)
        if lm and lm.get("x_norm") is not None:
            pts.append((int(lm["x_norm"] * w), int(lm["y_norm"] * h)))
        else:
            pts.append(None)

    for i in range(1, n):
        if pts[i - 1] is None or pts[i] is None:
            continue
        t = i / n
        color = (int(30 * t), int(210 * t), int(255 * t))
        cv2.line(frame, pts[i - 1], pts[i], color, max(1, int(2 * t)), cv2.LINE_AA)

    if pts[-1] is not None:
        cv2.circle(frame, pts[-1], 6, (0, 255, 255), -1, cv2.LINE_AA)

    return frame


# ---------------------------------------------------------------------------
# Viewer info panel
# ---------------------------------------------------------------------------

def make_viewer_panel(
    meta: dict,
    frame_idx: int,
    total_frames: int,
    velocities: np.ndarray,
    playing: bool,
    w: int = _CELL_W,
    h: int = _CELL_H,
) -> np.ndarray:
    panel = np.full((h, w, 3), 18, dtype=np.uint8)

    def txt(msg, x, y, scale=0.55, color=(200, 200, 200), thickness=1):
        cv2.putText(panel, msg, (x, y), cv2.FONT_HERSHEY_SIMPLEX,
                    scale, color, thickness, cv2.LINE_AA)

    def hline(y):
        cv2.line(panel, (20, y), (w - 20, y), (55, 55, 55), 1)

    # --- Title ---
    txt("BARBEL VIEWER", 20, 36, scale=0.75, color=(240, 240, 240), thickness=2)
    hline(50)

    # --- Session info ---
    txt("SESSION",  20,       72, scale=0.45, color=(110, 110, 110))
    txt("REP",      w // 2,   72, scale=0.45, color=(110, 110, 110))
    txt(meta.get("session_id", "—"), 20,     94, scale=0.65,
        color=(240, 240, 240), thickness=2)
    txt(str(meta.get("rep", "—")),   w // 2, 94, scale=0.65,
        color=(240, 240, 240), thickness=2)

    txt("RECORDED", 20, 118, scale=0.45, color=(110, 110, 110))
    txt(meta.get("timestamp", "—"), 20, 136, scale=0.48, color=(170, 170, 170))

    hline(150)

    # --- Playback status ---
    status     = "PLAYING" if playing else "PAUSED"
    status_col = (0, 210, 0) if playing else (0, 160, 210)
    txt(status, 20, 172, scale=0.65, color=status_col, thickness=2)
    txt(f"{frame_idx + 1} / {total_frames}",
        w // 2, 172, scale=0.58, color=(180, 180, 180))

    # Timeline bar
    tl_x, tl_y, tl_w, tl_h = 20, 182, w - 40, 12
    cv2.rectangle(panel, (tl_x, tl_y),
                  (tl_x + tl_w, tl_y + tl_h), (50, 50, 50), -1)
    progress = int((frame_idx / max(total_frames - 1, 1)) * tl_w)
    cv2.rectangle(panel, (tl_x, tl_y),
                  (tl_x + progress, tl_y + tl_h), (0, 160, 220), -1)
    cv2.rectangle(panel,
                  (tl_x + progress - 1, tl_y - 2),
                  (tl_x + progress + 1, tl_y + tl_h + 2),
                  (255, 255, 255), -1)

    hline(206)

    # --- Velocity graph ---
    txt("WRIST VELOCITY", 20, 226, scale=0.45, color=(110, 110, 110))

    gx, gy, gw, gh = 20, 234, w - 40, 150
    cv2.rectangle(panel, (gx, gy), (gx + gw, gy + gh), (28, 28, 28), -1)

    valid = velocities[~np.isnan(velocities)]
    v_max = float(valid.max()) if valid.size > 0 else 1.0
    v_max = max(v_max, 1e-6)

    # Velocity line
    pts_v = []
    n_vel = len(velocities)
    for i, v in enumerate(velocities):
        if not np.isnan(v):
            vx = gx + int(i / max(n_vel - 1, 1) * gw)
            vy = gy + gh - int((v / v_max) * (gh - 4)) - 2
            pts_v.append((vx, vy))

    for i in range(1, len(pts_v)):
        cv2.line(panel, pts_v[i - 1], pts_v[i], (0, 180, 80), 1, cv2.LINE_AA)

    # Current frame marker
    cx = gx + int(frame_idx / max(total_frames - 1, 1) * gw)
    cv2.line(panel, (cx, gy), (cx, gy + gh), (0, 200, 220), 1)

    # Current value dot
    if frame_idx < len(velocities) and not np.isnan(velocities[frame_idx]):
        cy = gy + gh - int((velocities[frame_idx] / v_max) * (gh - 4)) - 2
        cv2.circle(panel, (cx, cy), 4, (0, 230, 255), -1, cv2.LINE_AA)

    hline(396)

    # --- Controls ---
    txt("CONTROLS", 20, 416, scale=0.45, color=(110, 110, 110))
    txt("[Space] play/pause   [,][.] step   [][]] +/-10   [r] restart   [q] quit",
        20, 438, scale=0.38, color=(130, 130, 130))

    return panel


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Replay a Barbel pose recording.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Example:\n  python F_viewer.py SESS-0001_rep1",
    )
    parser.add_argument("recording",    help="Recording name, e.g. SESS-0001_rep1")
    parser.add_argument("--output-dir", default="output", help="Output directory")
    parser.add_argument("--fps",        type=int, default=_PLAYBACK_FPS,
                        help="Playback speed in fps (default 30)")
    args = parser.parse_args()

    output_dir = Path(args.output_dir)

    print(f"Loading {args.recording} ...")
    try:
        data, front_frames, side_frames = load_recording(args.recording, output_dir)
    except FileNotFoundError as exc:
        print(f"Error: {exc}")
        sys.exit(1)

    pose_seq     = data["pose_sequence"]
    meta         = {k: v for k, v in data.items() if k != "pose_sequence"}
    total_frames = len(pose_seq)

    if total_frames == 0:
        print("Recording has no frames.")
        sys.exit(1)

    print(f"  {total_frames} pose frames  |  "
          f"{len(front_frames)} front video frames  |  "
          f"{len(side_frames)} side video frames")

    velocities = compute_velocities(pose_seq)
    viz3d      = _Viewer3D()
    trail: List[List[Dict[str, Any]]] = []
    last_3d: Optional[np.ndarray]    = None

    cv2.namedWindow("Barbel Viewer", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Barbel Viewer", _CELL_W * 2 + 2, _CELL_H * 2 + 2)

    frame_idx   = 0
    playing     = True
    frame_delay = max(1, int(1000 / args.fps))

    def _get_video_frame(frames: List[np.ndarray], idx: int) -> Optional[np.ndarray]:
        return frames[idx].copy() if frames and idx < len(frames) else None

    while True:
        landmarks = pose_seq[frame_idx]

        # Update trail
        if not trail or trail[-1] is not landmarks:
            trail.append(landmarks)
        if len(trail) > _TRAIL_LEN:
            trail.pop(0)

        # Front frame
        front = _get_video_frame(front_frames, frame_idx)
        if front is None:
            front = np.zeros((_CELL_H, _CELL_W, 3), dtype=np.uint8)
            cv2.putText(front, "No video", (20, _CELL_H // 2),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (70, 70, 70), 1)
        front = draw_skeleton(front, landmarks)
        front = draw_trail_2d(front, trail)

        # Side frame
        side = _get_video_frame(side_frames, frame_idx)

        # 3D render — update every 3 frames to keep playback smooth
        if frame_idx % 3 == 0:
            viz3d.update(landmarks, trail=trail)
            last_3d = viz3d.get_render()

        panel = make_viewer_panel(
            meta, frame_idx, total_frames, velocities, playing,
        )

        cv2.imshow("Barbel Viewer", composite_frame(
            front, side, last_3d, panel,
            cell_h=_CELL_H, cell_w=_CELL_W,
        ))

        # Key handling — full value needed for arrow keys on Windows
        raw = cv2.waitKey(frame_delay if playing else 30)
        key = raw & 0xFF

        if key == ord("q"):
            break
        elif key == ord(" "):
            playing = not playing
        elif key == ord("r"):
            frame_idx = 0
            trail.clear()
            playing = True
        elif raw == 2424832 or key == ord(","):   # left arrow / comma
            playing   = False
            frame_idx = max(0, frame_idx - 1)
        elif raw == 2555904 or key == ord("."):   # right arrow / period
            playing   = False
            frame_idx = min(total_frames - 1, frame_idx + 1)
        elif key == ord("["):
            frame_idx = max(0, frame_idx - 10)
            trail.clear()
        elif key == ord("]"):
            frame_idx = min(total_frames - 1, frame_idx + 10)
            trail.clear()

        if playing:
            frame_idx += 1
            if frame_idx >= total_frames:
                frame_idx = total_frames - 1
                playing   = False  # pause at end

    viz3d.close()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
