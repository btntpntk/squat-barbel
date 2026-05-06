from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class CameraConfig:
    width: int = 640
    height: int = 480
    fps: int = 60


@dataclass
class SideCameraConfig:
    keyword: str = "Camo"   # matched against DirectShow device name (case-insensitive)
    index: int = 4          # fallback index when pygrabber discovery fails
    backend: int = 700      # cv2.CAP_DSHOW (Windows DirectShow)


@dataclass
class PoseConfig:
    model_complexity: int = 1
    min_detection_confidence: float = 0.5
    min_tracking_confidence: float = 0.5
    visibility_threshold: float = 0.5


@dataclass
class RecorderConfig:
    output_dir: Path = field(default_factory=lambda: Path("output"))
    video_codec: str = "mp4v"


@dataclass
class VizConfig:
    plot_update_interval: int = 5  # update 3D plot every N frames


@dataclass
class RepDetectorConfig:
    landmark_index: int = 16           # RIGHT_WRIST (MediaPipe index)
    axis: str = "y_norm"               # "y_norm" | "x_norm" | "z_3d"
    smoothing_window: int = 10         # rolling-average window in frames
    amplitude_threshold: float = 0.12  # min peak-to-valley swing to count
    min_rep_frames: int = 20           # debounce: min frames between reps
    return_ratio: float = 0.25         # signal must retreat this fraction of amplitude before firing
    peak_travel_dir: int = -1          # direction of travel INTO the peak: -1=local min (top of curl), +1=local max, 0=both


@dataclass
class AppConfig:
    camera: CameraConfig = field(default_factory=CameraConfig)
    side_camera: SideCameraConfig = field(default_factory=SideCameraConfig)
    pose: PoseConfig = field(default_factory=PoseConfig)
    recorder: RecorderConfig = field(default_factory=RecorderConfig)
    viz: VizConfig = field(default_factory=VizConfig)
    rep_detector: RepDetectorConfig = field(default_factory=RepDetectorConfig)
