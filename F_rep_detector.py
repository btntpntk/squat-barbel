import logging
from collections import deque
from typing import Any, Callable, Dict, List, Optional

import numpy as np

from F_config import RepDetectorConfig

log = logging.getLogger(__name__)


class RepDetector:
    """
    Two-phase rep-peak detector.

    Phase 1 — TRAVEL:
        Track the signal extreme (min or max) while moving in one direction.
        Transition to CONFIRM when the direction reverses.

    Phase 2 — CONFIRM:
        Hold the locked extreme. Only fire once the signal has retreated
        at least (return_ratio × amplitude) from the extreme. This prevents
        noise blips at the peak from triggering a premature rep cut.

    Both upward peaks (e.g. top of a curl) and downward peaks (e.g. bottom
    of a squat) fire, giving one segment per unidirectional movement for
    maximum labeling granularity.
    """

    def __init__(self, cfg: RepDetectorConfig) -> None:
        self._cfg = cfg
        self._buffer: deque = deque(maxlen=cfg.smoothing_window)
        self._prev: Optional[float]          = None
        self._dir: int                       = 0      # +1 rising / -1 falling / 0 unknown
        self._extreme: Optional[float]       = None   # locked peak value
        self._origin: Optional[float]        = None   # value at last fire point
        self._confirming: bool               = False  # True = in CONFIRM phase
        self._frames_since_rep: int          = 0
        self._amplitude: float               = 0.0
        self._callback: Optional[Callable[[], None]] = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def set_callback(self, fn: Callable[[], None]) -> None:
        self._callback = fn

    def feed(self, landmarks: List[Dict[str, Any]]) -> None:
        lm = next(
            (l for l in landmarks if l["index"] == self._cfg.landmark_index), None
        )
        if lm is None:
            return
        val = lm.get(self._cfg.axis)
        if val is None:
            return

        self._buffer.append(val)
        if len(self._buffer) < self._cfg.smoothing_window:
            return

        smoothed = float(np.mean(self._buffer))
        self._frames_since_rep += 1

        if self._prev is None:
            self._prev = self._extreme = self._origin = smoothed
            return

        d = smoothed - self._prev
        cur_dir = 0 if abs(d) < 1e-5 else (1 if d > 0 else -1)

        if not self._confirming:
            # ── TRAVEL phase ──────────────────────────────────────────
            if self._dir == 0 and cur_dir != 0:
                # First movement detected — initialise direction
                self._dir = cur_dir

            if cur_dir == self._dir:
                # Continuing in the same direction — push extreme further
                if self._dir == 1:
                    self._extreme = max(self._extreme, smoothed)
                elif self._dir == -1:
                    self._extreme = min(self._extreme, smoothed)
            elif cur_dir != 0 and cur_dir != self._dir:
                # Direction reversed — check if this peak type should be counted
                peak_dir = self._cfg.peak_travel_dir
                if peak_dir == 0 or self._dir == peak_dir:
                    # This is a countable peak — enter CONFIRM
                    self._confirming = True
                else:
                    # Wrong peak type (e.g. bottom of curl when we only want top) — skip
                    self._origin  = self._extreme
                    self._extreme = smoothed
                self._dir = cur_dir          # track return direction
        else:
            # ── CONFIRM phase ─────────────────────────────────────────
            # Keep tracking current direction so TRAVEL restarts cleanly
            if cur_dir != 0:
                self._dir = cur_dir

        # ── Metrics ───────────────────────────────────────────────────
        amplitude   = abs(self._extreme - self._origin) if self._origin is not None else 0.0
        return_dist = abs(smoothed - self._extreme)
        self._amplitude = amplitude

        # ── Fire condition ────────────────────────────────────────────
        if (
            self._confirming
            and amplitude   >= self._cfg.amplitude_threshold
            and return_dist >= self._cfg.return_ratio * amplitude
            and self._frames_since_rep >= self._cfg.min_rep_frames
        ):
            log.info(
                f"Rep peak — amp={amplitude:.3f}  "
                f"ret={return_dist:.3f}  frames={self._frames_since_rep}"
            )
            if self._callback:
                self._callback()
            # Reset for next rep
            self._origin        = self._extreme
            self._extreme       = smoothed
            self._confirming    = False
            self._frames_since_rep = 0
            self._amplitude     = 0.0

        self._prev = smoothed

    def get_status(self) -> Dict[str, Any]:
        return {
            "amplitude":   self._amplitude,
            "threshold":   self._cfg.amplitude_threshold,
            "trend":       self._dir,
            "confirming":  self._confirming,
            "frames":      self._frames_since_rep,
            "min_frames":  self._cfg.min_rep_frames,
        }

    def reset(self) -> None:
        self._buffer.clear()
        self._prev             = None
        self._dir              = 0
        self._extreme          = None
        self._origin           = None
        self._confirming       = False
        self._frames_since_rep = 0
        self._amplitude        = 0.0
