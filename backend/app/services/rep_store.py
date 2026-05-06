import json
import re
import logging
from pathlib import Path
from typing import Optional

from ..core.config import OUTPUT_DIR

_POSE_DIR      = OUTPUT_DIR / "pose-seq"
_VIDEO_DIR     = OUTPUT_DIR / "video"
_VIDEO_SIDE    = OUTPUT_DIR / "video-side"

# Cache used in batch mode: stem -> frame_count
_cache: dict[str, int] = {}

_REP_RE = re.compile(r'^(SESS-\d{4})(?:_[^_]+)?_rep(\d+)$', re.IGNORECASE)
_SESS_RE = re.compile(r'^(SESS-\d{4})', re.IGNORECASE)


def _parse_stem(stem: str) -> tuple[Optional[str], Optional[int]]:
    m = _REP_RE.match(stem)
    if m:
        return m.group(1).upper(), int(m.group(2))
    # Legacy files with no _repN suffix
    m2 = _SESS_RE.match(stem)
    if m2:
        return m2.group(1).upper(), None
    return None, None


def _get_frame_count(stem: str) -> int:
    path = _POSE_DIR / f"{stem}.json"
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return data.get("frame_count", len(data.get("pose_sequence", [])))
    except Exception:
        return 0


def _detect_current_session() -> Optional[str]:
    """Return the highest SESS number that has at least one _repN file."""
    if not _POSE_DIR.exists():
        return None
    sessions: set[str] = set()
    for p in _POSE_DIR.glob("*.json"):
        session, rep_num = _parse_stem(p.stem)
        if session and rep_num is not None:
            sessions.add(session)
    return max(sessions) if sessions else None


def build_cache() -> None:
    """Scan all pose-seq files and cache frame counts. Called at startup."""
    global _cache
    _cache = {}
    if not _POSE_DIR.exists():
        logging.warning(f"[rep_store] pose-seq dir not found: {_POSE_DIR}")
        return
    for p in sorted(_POSE_DIR.glob("*.json")):
        _cache[p.stem] = _get_frame_count(p.stem)
    logging.info(f"[rep_store] cached {len(_cache)} reps from {_POSE_DIR}")


def list_reps(mode: str) -> list[dict]:
    if not _POSE_DIR.exists():
        return []

    if mode == "live":
        # Scan fresh each call — only current session (small set)
        session = _detect_current_session()
        if not session:
            return []
        result = []
        for p in sorted(_POSE_DIR.glob("*.json")):
            stem_session, rep_num = _parse_stem(p.stem)
            if stem_session == session and rep_num is not None:
                result.append({
                    "id": p.stem,
                    "session": stem_session,
                    "rep_number": rep_num,
                    "frame_count": _get_frame_count(p.stem),
                })
        result.sort(key=lambda x: x["rep_number"])
        return result
    else:
        # Batch mode: use startup cache
        result = []
        for stem, frame_count in _cache.items():
            session, rep_num = _parse_stem(stem)
            if session:
                result.append({
                    "id": stem,
                    "session": session,
                    "rep_number": rep_num,
                    "frame_count": frame_count,
                })
        result.sort(key=lambda x: (x["session"], x["rep_number"] or 0))
        return result


def get_pose(rep_id: str) -> list:
    """Read pose JSON from disk and rename x_3d -> x_3d_meters etc."""
    path = _POSE_DIR / f"{rep_id}.json"
    if not path.exists():
        raise FileNotFoundError(f"Rep not found: {rep_id}")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    seq = data.get("pose_sequence", [])
    renamed: list[list[dict]] = []
    for frame in seq:
        renamed_frame = []
        for joint in frame:
            renamed_frame.append({
                "index":       joint.get("index"),
                "x_3d_meters": joint.get("x_3d"),
                "y_3d_meters": joint.get("y_3d"),
                "z_3d_meters": joint.get("z_3d"),
                "visibility":  joint.get("visibility", 1.0),
            })
        renamed.append(renamed_frame)
    return renamed


def get_video_path(rep_id: str, view: str) -> Path:
    base = _VIDEO_DIR if view == "front" else _VIDEO_SIDE
    for ext in (".mp4", ".avi"):
        p = base / f"{rep_id}{ext}"
        if p.exists():
            return p
    raise FileNotFoundError(f"Video not found for rep={rep_id} view={view}")
