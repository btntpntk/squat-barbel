# Backend Documentation

## Stack
- Python 3 · FastAPI · Uvicorn · Pydantic v2
- No database, no auth, no ORM
- Virtual environment: `backend/venv/`

## Running
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload            # → http://localhost:8000
uvicorn main:app --reload --port 8001
```

Install:
```bash
cd backend && python3 -m venv venv && source venv/bin/activate
pip install fastapi uvicorn pydantic python-dotenv
pip freeze > requirements.txt
```

Interactive docs: `http://localhost:8000/docs`

## Environment
`backend/.env`:
```
FRONTEND_ORIGIN=http://localhost:5173
```
Loaded via `python-dotenv` in `main.py`. Both the env value and the hardcoded fallback `http://localhost:5173` are added to `allow_origins`.

## Project Structure
```
backend/
├── main.py                  # FastAPI app, CORS middleware, router mount
└── app/
    ├── api/
    │   └── analyze.py       # POST /analyze endpoint
    ├── models/
    │   └── schemas.py       # Pydantic request/response models
    └── services/
        └── mock_analysis.py # Mock response generator
```

## API

### `POST /analyze`

**Request** — `AnalyzeRequest`:
```json
{
  "pose_sequence": [
    [
      { "index": 0, "x_3d_meters": 0.04, "y_3d_meters": -0.67,
        "z_3d_meters": 2.27, "visibility": 0.99 },
      ...33 joints per frame
    ],
    ...N frames
  ]
}
```
`visibility` defaults to `1.0` if omitted. Extra fields in the JSON (e.g. `x_2d_normalized`) are silently ignored by Pydantic.

**Response** — `AnalyzeResponse`:
```json
{
  "mistakes": ["Depth", "Trunk"],
  "confidences": { "Head": 0.0, ..., "Depth": 1.0, "Trunk": 0.88, ... },
  "rule_values": {
    "Head": { "val": 4.2, "threshold": 15.0, "unit": "°" }, ...
  },
  "phase_per_frame": ["START", "START", "DESCENT", "BOTTOM", "ASCENT", "FINISH", "FINISH"],
  "joint_heatmap": [[0.0, ..., 0.88, ...], ...],
  "phases": { "START": 2, "DESCENT": 1, "BOTTOM": 3, "ASCENT": 1, "FINISH": 2 }
}
```

**`joint_heatmap` shape**: `(N_frames, 36)`.
- Indices 0–32: standard MediaPipe joints
- Index 33: virtual mid-hip
- Index 34: virtual mid-shoulder
- Index 35: virtual mid-ear

**`phases.BOTTOM`**: frame **index** of the squat apex (not a count). All other phase values are frame **counts**.

**Severity thresholds** (used by frontend for coloring):
- `0.00–0.20` → normal (green)
- `0.21–0.50` → warning (orange)
- `0.51–1.00` → error (red, pulsing)

**10 label order** (matches `metadata.label` in rep JSON files):
Head · Hip · Frontal Knee · Tibial Angle · Foot · Depth · Thoracic · Trunk · Descent · Ascent

### `GET /`
Health check: `{"status": "ok", "message": "3D Squat Form Correction API"}`

## Connecting a Real Analysis Service

`backend/app/api/analyze.py` currently forces a fallback:
```python
try:
    raise NotImplementedError   # ← remove this line
except Exception:
    return generate_mock_response(request.pose_sequence)
```

Replace the `raise NotImplementedError` with a call to the real service. The service must return an `AnalyzeResponse` object. The mock response in `mock_analysis.py` documents the expected shape.

The mock generates:
- Heatmap with shoulder joints (11, 12, 34) fixed at 0.88 severity (Trunk mistake)
- Hip joints (23, 24, 33) peaking at 1.0 at the mid-sequence frame (Depth mistake)
- Knee joints (25, 26) at warning-level (~0.45) near the bottom
- Phases: first/last 2 frames = START/FINISH, mid frame = BOTTOM

## Pydantic Schemas (`app/models/schemas.py`)

```python
class JointData(BaseModel):
    index: int
    x_3d_meters: float
    y_3d_meters: float      # +Y is DOWN (MediaPipe convention)
    z_3d_meters: float      # depth from camera
    visibility: float = 1.0

class AnalyzeRequest(BaseModel):
    pose_sequence: List[List[JointData]]

class RuleValue(BaseModel):
    val: float
    threshold: float
    unit: str               # "°" or "m"

class AnalyzeResponse(BaseModel):
    mistakes: List[str]
    confidences: Dict[str, float]
    rule_values: Dict[str, RuleValue]
    phase_per_frame: List[str]
    joint_heatmap: List[List[float]]   # shape (N_frames, 36)
    phases: Dict[str, int]
```

## CORS
Configured in `main.py`. Allows the origin from `FRONTEND_ORIGIN` env var plus the hardcoded `http://localhost:5173`. To allow additional origins, add them to the `allow_origins` list in `main.py`.
