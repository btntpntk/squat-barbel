// MediaPipe standard pose connections (pairs of joint indices)
export const POSE_CONNECTIONS = [
  // Face
  [0, 7],
  [0, 8],
  // Shoulders
  [11, 12],
  // Left arm
  [11, 13],
  [13, 15],
  [15, 17],
  [15, 19],
  [15, 21],
  // Right arm
  [12, 14],
  [14, 16],
  [16, 18],
  [16, 20],
  [16, 22],
  // Torso
  [11, 23],
  [12, 24],
  [23, 24],
  // Left leg
  [23, 25],
  [25, 27],
  [27, 29],
  [27, 31],
  [29, 31],
  // Right leg
  [24, 26],
  [26, 28],
  [28, 30],
  [28, 32],
  [30, 32],
];
