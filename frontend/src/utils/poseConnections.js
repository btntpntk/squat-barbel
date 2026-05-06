// Exact copy of mp.solutions.pose.POSE_CONNECTIONS (mediapipe 0.10.x, 35 edges)
export const POSE_CONNECTIONS = [
  // Face — right side: nose → right-eye-inner → right-eye → right-eye-outer → right-ear
  [0, 1], [1, 2], [2, 3], [3, 7],
  // Face — left side: nose → left-eye-inner → left-eye → left-eye-outer → left-ear
  [0, 4], [4, 5], [5, 6], [6, 8],
  // Mouth corners
  [9, 10],
  // Shoulders
  [11, 12],
  // Left arm: shoulder → elbow → wrist → pinky / index / thumb, pinky–index cross
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  // Right arm: shoulder → elbow → wrist → pinky / index / thumb, pinky–index cross
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  // Torso
  [11, 23], [12, 24], [23, 24],
  // Left leg: hip → knee → ankle → heel / foot-index, ankle–foot cross
  [23, 25], [25, 27], [27, 29], [29, 31], [27, 31],
  // Right leg: hip → knee → ankle → heel / foot-index, ankle–foot cross
  [24, 26], [26, 28], [28, 30], [30, 32], [28, 32],
];
