import asyncio
import logging
from pathlib import Path

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

_queue: asyncio.Queue = asyncio.Queue(maxsize=10)
_observer: Observer | None = None


class _RepFileHandler(FileSystemEventHandler):
    def __init__(self, queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
        self._queue = queue
        self._loop = loop

    def _emit(self, path: Path) -> None:
        # Only fire for completed rep JSON files (not _tmp, not non-rep files)
        if path.suffix != ".json":
            return
        if "_tmp" in path.name:
            return
        if "rep" not in path.name.lower():
            return
        event = {"type": "new_rep", "id": path.stem}
        asyncio.run_coroutine_threadsafe(
            self._enqueue(event), self._loop
        )

    async def _enqueue(self, event: dict) -> None:
        try:
            self._queue.put_nowait(event)
        except asyncio.QueueFull:
            logging.warning("[file_watcher] Queue full, dropping event")

    def on_created(self, event):
        if not event.is_directory:
            self._emit(Path(event.src_path))

    def on_moved(self, event):
        # watchdog fires on_moved when a file is renamed (e.g. _tmp -> final)
        if not event.is_directory:
            self._emit(Path(event.dest_path))


def start_watcher(pose_dir: Path) -> None:
    global _observer
    loop = asyncio.get_event_loop()
    handler = _RepFileHandler(_queue, loop)
    _observer = Observer()
    _observer.schedule(handler, str(pose_dir), recursive=False)
    _observer.start()
    logging.info(f"[file_watcher] Watching {pose_dir}")


def stop_watcher() -> None:
    global _observer
    if _observer:
        _observer.stop()
        _observer.join()
        _observer = None


def get_queue() -> asyncio.Queue:
    return _queue
