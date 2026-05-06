import logging
import threading
from collections import deque
from typing import Optional, Tuple

import cv2
import numpy as np

from F_config import SideCameraConfig

log = logging.getLogger(__name__)

_INTEL_KEYWORDS = ("intel", "realsense", "depth")


def _discover_side_camera(cfg: SideCameraConfig) -> Tuple[int, str]:
    """Return (index, name) for the first non-Intel device matching cfg.keyword."""
    try:
        from pygrabber.dshow_graph import FilterGraph
        devices = FilterGraph().get_input_devices()
        log.info("DirectShow devices: %s", {i: n for i, n in enumerate(devices)})

        non_intel = [
            (i, name) for i, name in enumerate(devices)
            if not any(k in name.lower() for k in _INTEL_KEYWORDS)
        ]

        for i, name in non_intel:
            if cfg.keyword.lower() in name.lower():
                log.info("Side camera found: '%s' at index %d", name, i)
                return i, name

        if non_intel:
            i, name = non_intel[0]
            log.warning("No '%s' device — using first non-Intel '%s' (index %d)",
                        cfg.keyword, name, i)
            return i, name

        log.warning("No non-Intel cameras found — fallback to index %d", cfg.index)

    except Exception as exc:
        log.warning("Discovery error (%s) — fallback to index %d", exc, cfg.index)

    return cfg.index, f"index {cfg.index}"


class SideCamera:
    def __init__(self, cfg: SideCameraConfig) -> None:
        self._cfg = cfg
        # Discover NOW — before RealSense.start() triggers a hardware_reset that
        # transiently shuffles the DirectShow device list.
        self._index, self._dev_name = _discover_side_camera(cfg)
        self._cap: Optional[cv2.VideoCapture] = None
        self._buffer: deque = deque(maxlen=2)
        self._thread: Optional[threading.Thread] = None
        self._running = threading.Event()
        self.width: int = 0
        self.height: int = 0
        self.available: bool = False

    def start(self) -> None:
        self._cap = cv2.VideoCapture(self._index, self._cfg.backend)
        if not self._cap.isOpened():
            log.warning(
                "Side camera '%s' (index %d) not available — side recording disabled.",
                self._dev_name, self._index,
            )
            return
        self.width = int(self._cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self._cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.available = True
        log.info("Side camera '%s' opened: %dx%d", self._dev_name, self.width, self.height)
        self._running.set()
        self._thread = threading.Thread(
            target=self._capture_loop, daemon=True, name="side-cam"
        )
        self._thread.start()

    def _capture_loop(self) -> None:
        while self._running.is_set():
            ret, frame = self._cap.read()
            if ret:
                self._buffer.append(frame.copy())

    def get_latest(self) -> Optional[np.ndarray]:
        return self._buffer[-1] if self._buffer else None

    def stop(self) -> None:
        self._running.clear()
        if self._thread:
            self._thread.join(timeout=2)
        if self._cap:
            self._cap.release()
        log.info("Side camera stopped.")
