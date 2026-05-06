from fastapi import APIRouter
from ..models.schemas import AnalyzeRequest, AnalyzeResponse
from ..services.mock_analysis import generate_mock_response

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_pose(request: AnalyzeRequest) -> AnalyzeResponse:
    try:
        # Real analysis service not connected — always falls to mock
        raise NotImplementedError
    except Exception:
        return generate_mock_response(request.pose_sequence)
