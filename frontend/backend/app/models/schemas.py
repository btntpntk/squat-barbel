from pydantic import BaseModel
from typing import List, Dict, Optional


class JointData(BaseModel):
    index: int
    x_3d_meters: Optional[float] = None
    y_3d_meters: Optional[float] = None
    z_3d_meters: Optional[float] = None
    visibility: float = 1.0


class RepMeta(BaseModel):
    id: str
    session: str
    rep_number: Optional[int] = None
    frame_count: int


class AnalyzeRequest(BaseModel):
    pose_sequence: List[List[JointData]]


class RuleValue(BaseModel):
    val: float
    threshold: float
    unit: str


class AnalyzeResponse(BaseModel):
    mistakes: List[str]
    confidences: Dict[str, float]
    rule_values: Dict[str, RuleValue]
    phase_per_frame: List[str]
    joint_heatmap: List[List[float]]
    phases: Dict[str, int]
