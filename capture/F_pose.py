import logging
from typing import Any, Dict, List

import cv2
import numpy as np
import mediapipe as mp
import pyrealsense2 as rs

from F_config import PoseConfig

log = logging.getLogger(__name__)


class PoseEstimator:
    def __init__(self, cfg: PoseConfig) -> None:
        self._cfg = cfg
        mp_pose = mp.solutions.pose
        self._pose = mp_pose.Pose(
            static_image_mode=False,
            model_complexity=cfg.model_complexity,
            enable_segmentation=False,
            min_detection_confidence=cfg.min_detection_confidence,
            min_tracking_confidence=cfg.min_tracking_confidence,
        )

    def process(self, bgr_frame: np.ndarray):
        rgb = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB)
        rgb.flags.writeable = False
        return self._pose.process(rgb)

    def extract_landmarks(
        self,
        results,
        depth_arr: np.ndarray,
        intrinsics: rs.intrinsics,
        depth_scale: float,
        frame_shape: tuple,
    ) -> List[Dict[str, Any]]:
        if not results.pose_landmarks:
            return []

        h, w = frame_shape[:2]
        lms = results.pose_landmarks.landmark
        n = len(lms)

        # Vectorised pixel coordinates
        xs = np.array([lm.x for lm in lms])
        ys = np.array([lm.y for lm in lms])
        vis = np.array([lm.visibility for lm in lms])
        z_mp = np.array([lm.z for lm in lms])

        x_pix = np.clip(np.round(xs * w).astype(int), 0, w - 1)
        y_pix = np.clip(np.round(ys * h).astype(int), 0, h - 1)

        # Depth from array (fast numpy lookup vs per-call get_distance)
        depth_m = depth_arr[y_pix, x_pix].astype(np.float32) * depth_scale

        out: List[Dict[str, Any]] = []
        for i in range(n):
            x3 = y3 = z3 = None
            if vis[i] > self._cfg.visibility_threshold and depth_m[i] > 0:
                x3, y3, z3 = rs.rs2_deproject_pixel_to_point(
                    intrinsics, [int(x_pix[i]), int(y_pix[i])], float(depth_m[i])
                )
            out.append({
                "index": i,
                "x_3d": x3,
                "y_3d": y3,
                "z_3d": z3,
                "visibility": float(vis[i]),
                "x_norm": float(xs[i]),
                "y_norm": float(ys[i]),
                "z_mp": float(z_mp[i]),
            })
        return out

    def close(self) -> None:
        self._pose.close()
