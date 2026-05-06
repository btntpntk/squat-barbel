import asyncio
from fastapi import APIRouter
from fastapi.responses import Response, StreamingResponse

from ..core.config import OUTPUT_DIR

_LIVE_DIR = OUTPUT_DIR / "live"
_LIVE_DIR.mkdir(parents=True, exist_ok=True)   # created at import time (backend startup)

router = APIRouter()


@router.get("/live-feed/{view}")
async def live_feed(view: str):
    if view not in ("front", "side"):
        return Response(status_code=400)

    frame_file = OUTPUT_DIR / "live" / f"{view}.jpg"

    async def generate():
        while True:
            if frame_file.exists():
                try:
                    data = frame_file.read_bytes()
                    yield (
                        b"--frame\r\n"
                        b"Content-Type: image/jpeg\r\n\r\n"
                        + data
                        + b"\r\n"
                    )
                except OSError:
                    pass
                await asyncio.sleep(0.05)   # ~20 fps
            else:
                await asyncio.sleep(0.5)    # wait for capture system to start

    return StreamingResponse(
        generate(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
