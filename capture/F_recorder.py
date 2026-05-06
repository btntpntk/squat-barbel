import json
import logging
import queue
import re
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

from F_config import RecorderConfig

log = logging.getLogger(__name__)


class _AsyncVideoWriter:
    """Writes frames to disk on a background thread so the main loop never blocks on I/O."""

    def __init__(
        self, path: Path, fourcc: int, fps: int, size: Tuple[int, int]
    ) -> None:
        self._writer = cv2.VideoWriter(str(path), fourcc, fps, size)
        if not self._writer.isOpened():
            raise RuntimeError(f"VideoWriter failed to open: {path}")
        self._queue: queue.Queue = queue.Queue(maxsize=180)  # ~3 s at 60 fps
        self._thread = threading.Thread(
            target=self._loop, daemon=True, name=f"writer-{path.name}"
        )
        self._thread.start()

    def write(self, frame: np.ndarray) -> None:
        try:
            self._queue.put_nowait(frame)
        except queue.Full:
            pass  # drop frame rather than stall the pipeline

    def _loop(self) -> None:
        while True:
            frame = self._queue.get()
            if frame is None:
                break
            self._writer.write(frame)

    def release(self) -> None:
        self._queue.put(None)
        self._thread.join()
        self._writer.release()


class SessionRecorder:
    def __init__(self, cfg: RecorderConfig) -> None:
        self._cfg = cfg
        self._session_id: Optional[str] = None
        self._rep: int = 0
        self._collecting: bool = False
        self._in_session: bool = False
        self._pose_seq: List[List[Dict[str, Any]]] = []
        self._front_writer: Optional[_AsyncVideoWriter] = None
        self._side_writer: Optional[_AsyncVideoWriter] = None
        self._front_tmp: Optional[Path] = None
        self._side_tmp: Optional[Path] = None

        for sub in ("pose-seq", "video", "video-side"):
            (cfg.output_dir / sub).mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Public state
    # ------------------------------------------------------------------

    @property
    def is_collecting(self) -> bool:
        return self._collecting

    @property
    def in_session(self) -> bool:
        return self._in_session

    @property
    def rep(self) -> int:
        return self._rep

    @property
    def session_id(self) -> Optional[str]:
        return self._session_id

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def start_session(
        self,
        fps: int,
        front_size: Tuple[int, int],
        side_size: Optional[Tuple[int, int]],
    ) -> None:
        self._session_id = self._next_id()
        self._rep = 1
        self._in_session = True
        self._collecting = True
        self._pose_seq = []
        self._open_writers(fps, front_size, side_size)
        log.info(f"Session {self._session_id} started.")

    def end_rep(
        self,
        fps: int,
        front_size: Tuple[int, int],
        side_size: Optional[Tuple[int, int]],
    ) -> None:
        self._flush()
        self._rep += 1
        self._pose_seq = []
        self._open_writers(fps, front_size, side_size)
        log.info(f"Rep {self._rep} started.")

    def end_session(self) -> None:
        if not self._in_session:
            return
        if self._collecting and self._pose_seq:
            self._flush()
        self._in_session = False
        self._collecting = False
        log.info(f"Session {self._session_id} ended.")

    # ------------------------------------------------------------------
    # Frame / data ingestion
    # ------------------------------------------------------------------

    def write_frames(
        self, front: np.ndarray, side: Optional[np.ndarray]
    ) -> None:
        if not self._collecting:
            return
        if self._front_writer:
            self._front_writer.write(front)
        if self._side_writer and side is not None:
            self._side_writer.write(side)

    def add_landmarks(self, frame_landmarks: List[Dict[str, Any]]) -> None:
        if self._collecting:
            self._pose_seq.append(frame_landmarks)

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _open_writers(
        self,
        fps: int,
        front_size: Tuple[int, int],
        side_size: Optional[Tuple[int, int]],
    ) -> None:
        fourcc = cv2.VideoWriter_fourcc(*self._cfg.video_codec)
        tag = f"{self._session_id}_rep{self._rep}"

        self._front_tmp = self._cfg.output_dir / "video" / f"{tag}_tmp.mp4"
        self._front_writer = _AsyncVideoWriter(self._front_tmp, fourcc, fps, front_size)

        self._side_writer = None
        self._side_tmp = None
        if side_size:
            self._side_tmp = (
                self._cfg.output_dir / "video-side" / f"{tag}_tmp.mp4"
            )
            try:
                self._side_writer = _AsyncVideoWriter(
                    self._side_tmp, fourcc, fps, side_size
                )
            except RuntimeError as exc:
                log.warning(f"Side writer skipped: {exc}")

    def _flush(self) -> None:
        if self._front_writer:
            self._front_writer.release()
            self._front_writer = None
            final = Path(str(self._front_tmp).replace("_tmp.mp4", ".mp4"))
            if self._front_tmp and self._front_tmp.exists():
                self._front_tmp.rename(final)
                log.info(f"Front video → {final.name}")

        if self._side_writer:
            self._side_writer.release()
            self._side_writer = None
            final_s = Path(str(self._side_tmp).replace("_tmp.mp4", ".mp4"))
            if self._side_tmp and self._side_tmp.exists():
                self._side_tmp.rename(final_s)
                log.info(f"Side video  → {final_s.name}")

        json_path = (
            self._cfg.output_dir
            / "pose-seq"
            / f"{self._session_id}_rep{self._rep}.json"
        )
        payload = {
            "session_id": self._session_id,
            "rep": self._rep,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "frame_count": len(self._pose_seq),
            "pose_sequence": self._pose_seq,
        }
        with open(json_path, "w") as fh:
            json.dump(payload, fh)
        log.info(
            f"Pose sequence → {json_path.name}  ({len(self._pose_seq)} frames)"
        )

    def _next_id(self) -> str:
        ids: List[int] = []
        for sub in ("pose-seq", "video"):
            folder = self._cfg.output_dir / sub
            if folder.exists():
                for p in folder.iterdir():
                    m = re.match(r"SESS-(\d+)", p.name)
                    if m:
                        ids.append(int(m.group(1)))
        return f"SESS-{(max(ids, default=0) + 1):04d}"
