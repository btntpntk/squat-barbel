import asyncio
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from ..services.file_watcher import get_queue

router = APIRouter()


@router.get("/events")
async def sse_stream():
    async def generator():
        # Handshake so the client knows the connection is alive
        yield 'data: {"type":"connected"}\n\n'
        queue = get_queue()
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=20)
                yield f"data: {json.dumps(event)}\n\n"
            except asyncio.TimeoutError:
                # Keep-alive comment line (does not trigger onmessage)
                yield ": ping\n\n"

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
