import logging
import threading
import time
from collections import deque
from typing import Optional, Tuple

import numpy as np
import pyrealsense2 as rs

from F_config import CameraConfig

log = logging.getLogger(__name__)


class RealSenseCamera:
    def __init__(self, cfg: CameraConfig) -> None:
        self._cfg = cfg
        self._pipeline: Optional[rs.pipeline] = None
        self._align: Optional[rs.align] = None
        self._intrinsics: Optional[rs.intrinsics] = None
        self._depth_scale: float = 0.0
        self._buffer: deque = deque(maxlen=2)
        self._thread: Optional[threading.Thread] = None
        self._running = threading.Event()

    def start(self) -> None:
        ctx = rs.context()
        devices = ctx.query_devices()
        if not devices:
            raise RuntimeError("No RealSense device found.")

        log.info(f"Found {len(devices)} RealSense device(s). Resetting...")
        for dev in devices:
            dev.hardware_reset()
        time.sleep(2)

        self._pipeline = rs.pipeline()
        rs_cfg = rs.config()
        w, h, fps = self._cfg.width, self._cfg.height, self._cfg.fps
        rs_cfg.enable_stream(rs.stream.depth, w, h, rs.format.z16, fps)
        rs_cfg.enable_stream(rs.stream.color, w, h, rs.format.bgr8, fps)

        profile = self._pipeline.start(rs_cfg)
        self._align = rs.align(rs.stream.color)
        self._depth_scale = (
            profile.get_device().first_depth_sensor().get_depth_scale()
        )
        log.info(f"RealSense started — depth scale: {self._depth_scale:.6f}")

        self._running.set()
        self._thread = threading.Thread(
            target=self._capture_loop, daemon=True, name="realsense"
        )
        self._thread.start()

    def _capture_loop(self) -> None:
        while self._running.is_set():
            try:
                frames = self._pipeline.wait_for_frames(timeout_ms=100)
                aligned = self._align.process(frames)
                depth_f = aligned.get_depth_frame()
                color_f = aligned.get_color_frame()
                if not depth_f or not color_f:
                    continue
                if self._intrinsics is None:
                    self._intrinsics = (
                        depth_f.profile.as_video_stream_profile().intrinsics
                    )
                color_arr = np.asanyarray(color_f.get_data()).copy()
                depth_arr = np.asanyarray(depth_f.get_data()).copy()
                self._buffer.append((color_arr, depth_arr))
            except RuntimeError:
                pass

    def get_latest(self) -> Optional[Tuple[np.ndarray, np.ndarray]]:
        return self._buffer[-1] if self._buffer else None

    def stop(self) -> None:
        self._running.clear()
        if self._thread:
            self._thread.join(timeout=2)
        if self._pipeline:
            self._pipeline.stop()
        log.info("RealSense stopped.")

    @property
    def intrinsics(self) -> Optional[rs.intrinsics]:
        return self._intrinsics

    @property
    def depth_scale(self) -> float:
        return self._depth_scale
