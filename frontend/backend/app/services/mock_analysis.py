from typing import List
from ..models.schemas import AnalyzeResponse, RuleValue


def generate_mock_response(pose_sequence) -> AnalyzeResponse:
    n_frames = len(pose_sequence)
    bottom_idx = max(0, n_frames // 2)

    heatmap = []
    for i in range(n_frames):
        frame_heatmap = [0.0] * 36
        # Trunk mistake: shoulders
        frame_heatmap[11] = 0.88
        frame_heatmap[12] = 0.88
        frame_heatmap[34] = 0.88  # virtual mid-shoulder

        # Depth mistake: hips worst at bottom frame
        proximity = 1.0 - min(1.0, abs(i - bottom_idx) / max(1, n_frames * 0.4))
        hip_severity = min(1.0, proximity * 1.1)
        frame_heatmap[23] = hip_severity
        frame_heatmap[24] = hip_severity
        frame_heatmap[33] = hip_severity  # virtual mid-hip

        # Knees: mild warning near bottom
        knee_severity = min(0.45, proximity * 0.5)
        frame_heatmap[25] = knee_severity
        frame_heatmap[26] = knee_severity

        heatmap.append(frame_heatmap)

    phase_per_frame = []
    for i in range(n_frames):
        if i < 2:
            phase_per_frame.append("START")
        elif i < bottom_idx:
            phase_per_frame.append("DESCENT")
        elif i == bottom_idx:
            phase_per_frame.append("BOTTOM")
        elif i < n_frames - 2:
            phase_per_frame.append("ASCENT")
        else:
            phase_per_frame.append("FINISH")

    return AnalyzeResponse(
        mistakes=["Depth", "Trunk"],
        confidences={
            "Head": 0.0,
            "Hip": 0.0,
            "Frontal Knee": 0.0,
            "Tibial Angle": 0.0,
            "Foot": 0.0,
            "Depth": 1.0,
            "Thoracic": 0.12,
            "Trunk": 0.88,
            "Descent": 0.05,
            "Ascent": 0.02,
        },
        rule_values={
            "Head": RuleValue(val=4.2, threshold=15.0, unit="°"),
            "Hip": RuleValue(val=0.012, threshold=0.05, unit="m"),
            "Frontal Knee": RuleValue(val=0.008, threshold=0.02, unit="m"),
            "Tibial Angle": RuleValue(val=3.5, threshold=10.0, unit="°"),
            "Foot": RuleValue(val=0.002, threshold=0.02, unit="m"),
            "Depth": RuleValue(val=0.115, threshold=0.05, unit="m"),
        },
        phase_per_frame=phase_per_frame,
        joint_heatmap=heatmap,
        phases={
            "START": 2,
            "DESCENT": max(1, bottom_idx - 2),
            "BOTTOM": bottom_idx,
            "ASCENT": max(1, n_frames - bottom_idx - 3),
            "FINISH": 2,
        },
    )
