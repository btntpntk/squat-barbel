import logging
import time
from typing import Optional

import cv2
import numpy as np

from F_config import AppConfig
from F_camera import RealSenseCamera
from F_side_camera import SideCamera
from F_pose import PoseEstimator
from F_recorder import SessionRecorder
from F_rep_detector import RepDetector
from F_visualizer import Overlay2D, Visualizer3D, composite_frame, make_info_panel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("barbel")

_CELL_H = 480
_CELL_W = 640


def main() -> None:
    cfg = AppConfig()

    camera    = RealSenseCamera(cfg.camera)
    side_cam  = SideCamera(cfg.side_camera)
    estimator = PoseEstimator(cfg.pose)
    recorder  = SessionRecorder(cfg.recorder)
    detector  = RepDetector(cfg.rep_detector)
    overlay   = Overlay2D()
    viz3d     = Visualizer3D()

    camera.start()
    side_cam.start()

    cv2.namedWindow("Barbel", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Barbel", _CELL_W * 2 + 2, _CELL_H * 2 + 2)

    front_size = (cfg.camera.width, cfg.camera.height)
    side_size  = (side_cam.width, side_cam.height) if side_cam.available else None

    frame_idx = 0
    t_prev    = time.perf_counter()
    fps       = 0.0
    running   = True
    last_3d: Optional[np.ndarray] = None

    def _on_rep() -> None:
        if recorder.in_session:
            recorder.end_rep(cfg.camera.fps, front_size, side_size)

    detector.set_callback(_on_rep)

    try:
        while running:
            data = camera.get_latest()
            if data is None:
                continue

            color_arr, depth_arr = data
            side_frame = side_cam.get_latest() if side_cam.available else None

            results   = estimator.process(color_arr)
            landmarks: list = []
            if results.pose_landmarks and camera.intrinsics:
                landmarks = estimator.extract_landmarks(
                    results, depth_arr, camera.intrinsics,
                    camera.depth_scale, color_arr.shape,
                )

            now    = time.perf_counter()
            fps    = 1.0 / max(now - t_prev, 1e-9)
            t_prev = now
            frame_idx += 1

            recorder.write_frames(color_arr, side_frame)
            if landmarks:
                recorder.add_landmarks(landmarks)
                if recorder.in_session:
                    detector.feed(landmarks)

            if frame_idx % cfg.viz.plot_update_interval == 0 and landmarks:
                viz3d.update(landmarks)
                last_3d = viz3d.get_render()

            annotated = overlay.draw(
                color_arr, results, landmarks,
                recorder.is_collecting, recorder.rep,
                recorder.session_id, fps,
            )
            info = make_info_panel(
                recorder.session_id, recorder.rep,
                recorder.is_collecting, fps,
                detect_status=detector.get_status() if recorder.in_session else None,
                w=_CELL_W, h=_CELL_H,
            )
            cv2.imshow("Barbel", composite_frame(
                annotated, side_frame, last_3d, info,
                cell_h=_CELL_H, cell_w=_CELL_W,
            ))

            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                running = False
            elif key == ord("s"):
                if not recorder.in_session:
                    detector.reset()
                    recorder.start_session(cfg.camera.fps, front_size, side_size)
                    log.info("Session started — auto rep detection active   [s] end session")
                else:
                    recorder.end_session()
                    detector.reset()
            elif key == ord("p"):
                if recorder.in_session:
                    log.info("Manual rep split.")
                    recorder.end_rep(cfg.camera.fps, front_size, side_size)
                    detector.reset()

    finally:
        recorder.end_session()
        camera.stop()
        side_cam.stop()
        estimator.close()
        viz3d.close()
        cv2.destroyAllWindows()
        log.info("Done.")


if __name__ == "__main__":
    main()
