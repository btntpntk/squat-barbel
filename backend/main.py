import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.core.config import MODE, OUTPUT_DIR
from app.api.analyze import router as analyze_router
from app.api.reps import router as reps_router
from app.api.events import router as events_router
from app.services import rep_store
from app.services.file_watcher import start_watcher, stop_watcher

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    rep_store.build_cache()
    logging.info(f"[startup] MODE={MODE}  OUTPUT_DIR={OUTPUT_DIR}")

    if MODE == "live":
        pose_dir = OUTPUT_DIR / "pose-seq"
        pose_dir.mkdir(parents=True, exist_ok=True)
        start_watcher(pose_dir)

    yield

    if MODE == "live":
        stop_watcher()


app = FastAPI(
    title="3D Squat Form Correction API",
    version="1.0.0",
    lifespan=lifespan,
)

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router)
app.include_router(reps_router)
app.include_router(events_router)


@app.get("/")
async def root():
    return {"status": "ok", "mode": MODE, "output_dir": str(OUTPUT_DIR)}
