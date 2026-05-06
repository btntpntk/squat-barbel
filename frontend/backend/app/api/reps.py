from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from typing import List

from ..models.schemas import RepMeta
from ..services import rep_store
from ..core.config import MODE

router = APIRouter()


@router.get("/reps", response_model=List[RepMeta])
async def list_reps():
    return rep_store.list_reps(MODE)


@router.get("/reps/{rep_id}/pose")
async def get_pose(rep_id: str):
    try:
        data = rep_store.get_pose(rep_id)
        return JSONResponse(content=data)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Rep not found: {rep_id}")


@router.get("/reps/{rep_id}/video/{view}")
async def stream_video(rep_id: str, view: str, request: Request):
    if view not in ("front", "side"):
        raise HTTPException(status_code=400, detail="view must be 'front' or 'side'")

    try:
        path = rep_store.get_video_path(rep_id, view)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Video not found: {rep_id} ({view})")

    file_size = path.stat().st_size
    media_type = "video/mp4" if path.suffix.lower() == ".mp4" else "video/x-msvideo"

    def iterfile(start: int, end: int):
        with open(path, "rb") as f:
            f.seek(start)
            remaining = end - start + 1
            chunk = 1024 * 1024  # 1 MB
            while remaining > 0:
                data = f.read(min(chunk, remaining))
                if not data:
                    break
                remaining -= len(data)
                yield data

    range_header = request.headers.get("Range")
    if range_header:
        try:
            byte_range = range_header.strip().replace("bytes=", "")
            start_s, end_s = byte_range.split("-")
            start = int(start_s)
            end = int(end_s) if end_s else file_size - 1
        except Exception:
            raise HTTPException(status_code=416, detail="Invalid Range header")

        end = min(end, file_size - 1)
        return StreamingResponse(
            iterfile(start, end),
            status_code=206,
            media_type=media_type,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(end - start + 1),
            },
        )

    return StreamingResponse(
        iterfile(0, file_size - 1),
        media_type=media_type,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
        },
    )
