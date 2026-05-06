import logging
from typing import Any, Dict, List, Optional

import cv2
import numpy as np
import mediapipe as mp
import matplotlib
matplotlib.use("Agg")  # off-screen — must precede pyplot import
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D  # noqa: F401

log = logging.getLogger(__name__)

_mp_drawing = mp.solutions.drawing_utils
_mp_pose = mp.solutions.pose
POSE_CONNECTIONS = mp.solutions.pose.POSE_CONNECTIONS

_PL = mp.solutions.pose.PoseLandmark
_LEFT_IDX = {
    _PL.LEFT_EYE_INNER, _PL.LEFT_EYE, _PL.LEFT_EYE_OUTER,
    _PL.LEFT_EAR, _PL.MOUTH_LEFT,
    _PL.LEFT_SHOULDER, _PL.LEFT_ELBOW, _PL.LEFT_WRIST,
    _PL.LEFT_PINKY, _PL.LEFT_INDEX, _PL.LEFT_THUMB,
    _PL.LEFT_HIP, _PL.LEFT_KNEE, _PL.LEFT_ANKLE,
    _PL.LEFT_HEEL, _PL.LEFT_FOOT_INDEX,
}
_RIGHT_IDX = {
    _PL.RIGHT_EYE_INNER, _PL.RIGHT_EYE, _PL.RIGHT_EYE_OUTER,
    _PL.RIGHT_EAR, _PL.MOUTH_RIGHT,
    _PL.RIGHT_SHOULDER, _PL.RIGHT_ELBOW, _PL.RIGHT_WRIST,
    _PL.RIGHT_PINKY, _PL.RIGHT_INDEX, _PL.RIGHT_THUMB,
    _PL.RIGHT_HIP, _PL.RIGHT_KNEE, _PL.RIGHT_ANKLE,
    _PL.RIGHT_HEEL, _PL.RIGHT_FOOT_INDEX,
}
_LEFT_IDX = {lm.value for lm in _LEFT_IDX}
_RIGHT_IDX = {lm.value for lm in _RIGHT_IDX}

# Separator between cells
_SEP_PX = 2
_SEP_COLOR = (55, 55, 55)


# ---------------------------------------------------------------------------
# 2D overlay
# ---------------------------------------------------------------------------

class Overlay2D:
    """Draws skeleton, per-landmark depth, FPS, and recording HUD onto a BGR frame."""

    def draw(
        self,
        frame: np.ndarray,
        results,
        landmarks_3d: List[Dict[str, Any]],
        is_recording: bool,
        rep: int,
        session_id: Optional[str],
        fps: float,
    ) -> np.ndarray:
        out = frame.copy()
        h, w = out.shape[:2]

        _mp_drawing.draw_landmarks(
            out, results.pose_landmarks, _mp_pose.POSE_CONNECTIONS
        )

        for lm in landmarks_3d:
            if lm["z_3d"] is not None:
                x = int(lm["x_norm"] * w)
                y = int(lm["y_norm"] * h)
                cv2.putText(
                    out, f"{lm['z_3d']:.2f}m", (x + 4, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.35, (255, 255, 255), 1,
                    cv2.LINE_AA,
                )

        # FPS — top-left
        cv2.putText(
            out, f"{fps:.1f} fps", (10, 26),
            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 220, 0), 2, cv2.LINE_AA,
        )

        if is_recording:
            cv2.circle(out, (w - 20, 20), 9, (0, 0, 220), -1)
            label = f"{session_id}  Rep {rep}" if session_id else f"Rep {rep}"
            (tw, _), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.putText(
                out, label, (w - tw - 34, 26),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 220), 2, cv2.LINE_AA,
            )

        return out


# ---------------------------------------------------------------------------
# 3D skeleton — off-screen matplotlib (Agg)
# ---------------------------------------------------------------------------

class Visualizer3D:
    """Renders the 3D skeleton off-screen and exposes it as a BGR numpy array."""

    def __init__(self) -> None:
        self._fig = plt.figure(figsize=(6.4, 4.8), dpi=100)
        self._ax = self._fig.add_subplot(111, projection="3d")
        self._last_render: Optional[np.ndarray] = None

    def update(self, landmarks: List[Dict[str, Any]]) -> None:
        ax = self._ax
        ax.clear()

        xs: List[float] = []
        ys: List[float] = []
        zs: List[float] = []
        colors: List[str] = []

        for lm in landmarks:
            if lm["x_3d"] is None:
                xs.append(np.nan)
                ys.append(np.nan)
                zs.append(np.nan)
            else:
                xs.append(-lm["x_3d"])
                ys.append(lm["z_3d"])
                zs.append(-lm["y_3d"])

            idx = lm["index"]
            if idx in _LEFT_IDX:
                colors.append("royalblue")
            elif idx in _RIGHT_IDX:
                colors.append("tomato")
            else:
                colors.append("silver")

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

        ax.set_xlabel("X (m)")
        ax.set_ylabel("Z (m)")
        ax.set_zlabel("Y (m)")
        ax.set_title("3D Skeleton", pad=6)
        ax.set_xlim(-1, 1)
        ax.set_ylim(1, 3)
        ax.set_zlim(-1, 1)
        ax.view_init(elev=20, azim=-75)

        self._fig.canvas.draw()
        buf = np.frombuffer(self._fig.canvas.buffer_rgba(), dtype=np.uint8)
        cw, ch = self._fig.canvas.get_width_height()
        self._last_render = cv2.cvtColor(
            buf.reshape(ch, cw, 4), cv2.COLOR_RGBA2BGR
        )

    def get_render(self) -> Optional[np.ndarray]:
        return self._last_render

    def close(self) -> None:
        plt.close(self._fig)


# ---------------------------------------------------------------------------
# Info panel (bottom-right cell)
# ---------------------------------------------------------------------------

def make_info_panel(
    session_id: Optional[str],
    rep: int,
    is_recording: bool,
    fps: float,
    detect_status: Optional[Dict[str, Any]] = None,
    w: int = 640,
    h: int = 480,
) -> np.ndarray:
    panel = np.full((h, w, 3), 18, dtype=np.uint8)

    def text(msg, x, y, scale=0.6, color=(210, 210, 210), thickness=1):
        cv2.putText(panel, msg, (x, y), cv2.FONT_HERSHEY_SIMPLEX,
                    scale, color, thickness, cv2.LINE_AA)

    def hline(y):
        cv2.line(panel, (20, y), (w - 20, y), (55, 55, 55), 1)

    # Title
    text("BARBEL POSE RECORDER", 20, 44, scale=0.75,
         color=(240, 240, 240), thickness=2)
    hline(58)

    # Session block
    text("SESSION", 20, 86, scale=0.5, color=(110, 110, 110))
    text(session_id if session_id else "—", 20, 110,
         scale=0.7, color=(240, 240, 240), thickness=2)

    text("REP", 20, 140, scale=0.5, color=(110, 110, 110))
    text(str(rep) if rep else "—", 20, 164,
         scale=0.7, color=(240, 240, 240), thickness=2)

    hline(180)

    # Status + FPS on the same row band
    text("STATUS", 20, 204, scale=0.5, color=(110, 110, 110))
    text("FPS", w // 2, 204, scale=0.5, color=(110, 110, 110))

    if is_recording:
        cv2.circle(panel, (28, 228), 7, (0, 0, 210), -1)
        text("RECORDING", 44, 234, scale=0.6, color=(80, 80, 220), thickness=2)
    else:
        cv2.circle(panel, (28, 228), 7, (80, 80, 80), -1)
        text("IDLE", 44, 234, scale=0.6, color=(130, 130, 130))

    text(f"{fps:.1f}", w // 2, 234, scale=0.7, color=(0, 210, 0), thickness=2)

    hline(252)

    if detect_status is not None:
        # --- Detection indicator ---
        amp        = detect_status["amplitude"]
        threshold  = detect_status["threshold"]
        trend      = detect_status["trend"]
        confirming = detect_status.get("confirming", False)
        frames     = detect_status["frames"]
        min_f      = detect_status["min_frames"]

        # Phase label: TRAVEL (green) or CONFIRM (yellow)
        if confirming:
            phase_label = "CONFIRM"
            phase_col   = (0, 200, 220)   # yellow
        else:
            phase_label = "TRAVEL"
            phase_col   = (0, 190, 80)    # green

        text("DETECTION", 20, 276, scale=0.5, color=(110, 110, 110))
        text(phase_label, w - 20 - len(phase_label) * 9, 276,
             scale=0.5, color=phase_col)

        # Trend arrow (^ = rising signal, v = falling)
        arrow     = "^" if trend == -1 else ("v" if trend == 1 else "-")
        arrow_col = phase_col if trend != 0 else (90, 90, 90)
        text(arrow, 20, 306, scale=0.9, color=arrow_col, thickness=2)

        # Amplitude progress bar
        # Green = traveling / growing amplitude
        # Yellow = confirming (past peak, waiting for return)
        # Blue = threshold exceeded (ready to fire once return_ratio met)
        bar_x, bar_y, bar_w, bar_h = 46, 290, w - 66, 18
        cv2.rectangle(panel, (bar_x, bar_y), (bar_x + bar_w, bar_y + bar_h),
                      (40, 40, 40), -1)
        fill = int(min(amp / max(threshold, 1e-6), 1.0) * bar_w)
        if confirming:
            bar_col = (0, 200, 220)        # yellow — in confirm phase
        elif amp >= threshold:
            bar_col = (0, 80, 220)         # blue — threshold crossed
        else:
            bar_col = (0, 180, 70)         # green — building amplitude
        if fill > 0:
            cv2.rectangle(panel, (bar_x, bar_y), (bar_x + fill, bar_y + bar_h),
                          bar_col, -1)
        text(f"{amp:.3f} / {threshold:.2f}", bar_x + 4, bar_y + 13,
             scale=0.38, color=(200, 200, 200))

        # Debounce bar
        text("DEBOUNCE", 20, 334, scale=0.5, color=(110, 110, 110))
        db_x, db_y, db_w, db_h = 20, 342, w - 40, 14
        cv2.rectangle(panel, (db_x, db_y), (db_x + db_w, db_y + db_h),
                      (40, 40, 40), -1)
        db_fill = int(min(frames / max(min_f, 1), 1.0) * db_w)
        db_col  = (0, 180, 70) if frames >= min_f else (90, 90, 150)
        if db_fill > 0:
            cv2.rectangle(panel, (db_x, db_y), (db_x + db_fill, db_y + db_h),
                          db_col, -1)

        hline(368)

        # Abbreviated controls while recording
        text("CONTROLS", 20, 392, scale=0.5, color=(110, 110, 110))
        text("[p]  manual split   [s]  end   [q]  quit",
             20, 416, scale=0.46, color=(140, 140, 140))

    else:
        # --- Full controls when idle ---
        text("CONTROLS", 20, 276, scale=0.5, color=(110, 110, 110))
        text("[s]  start session",      20, 306, scale=0.52, color=(170, 170, 170))
        text("[p]  manual rep split",   20, 334, scale=0.52, color=(170, 170, 170))
        text("[q]  quit",               20, 362, scale=0.52, color=(170, 170, 170))

    return panel


# ---------------------------------------------------------------------------
# Compositor — assembles 2x2 grid into a single frame
# ---------------------------------------------------------------------------

def composite_frame(
    front: np.ndarray,
    side: Optional[np.ndarray],
    plot_3d: Optional[np.ndarray],
    info: np.ndarray,
    cell_h: int = 480,
    cell_w: int = 640,
) -> np.ndarray:
    def _fit(img: np.ndarray) -> np.ndarray:
        return cv2.resize(img, (cell_w, cell_h), interpolation=cv2.INTER_LINEAR)

    def _placeholder(msg: str) -> np.ndarray:
        ph = np.full((cell_h, cell_w, 3), 25, dtype=np.uint8)
        (tw, th), _ = cv2.getTextSize(msg, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
        cv2.putText(
            ph, msg, ((cell_w - tw) // 2, (cell_h + th) // 2),
            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (75, 75, 75), 1, cv2.LINE_AA,
        )
        return ph

    tl = _fit(front)
    tr = _fit(plot_3d) if plot_3d is not None else _placeholder("Waiting for pose...")
    bl = _fit(side)    if side    is not None else _placeholder("No side camera")
    br = _fit(info)

    v_sep = np.full((cell_h, _SEP_PX, 3), _SEP_COLOR[0], dtype=np.uint8)
    top = np.hstack([tl, v_sep, tr])
    bot = np.hstack([bl, v_sep, br])

    h_sep = np.full((_SEP_PX, cell_w * 2 + _SEP_PX, 3), _SEP_COLOR[0], dtype=np.uint8)
    return np.vstack([top, h_sep, bot])
