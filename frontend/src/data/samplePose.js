// 7-frame squat sequence generated from standing ↔ squat-bottom interpolation.
// Coordinate system: +y = down (MediaPipe convention), z = depth from camera (~2 m).
// Frame 0–1: standing, Frame 2: descent, Frame 3: bottom, Frame 4: ascent, Frame 5–6: standing.

const STANDING = [
  { index: 0,  x: 0.025,  y: -0.530, z: 2.050 },
  { index: 1,  x: 0.035,  y: -0.545, z: 2.030 },
  { index: 2,  x: 0.045,  y: -0.545, z: 2.050 },
  { index: 3,  x: 0.055,  y: -0.540, z: 2.070 },
  { index: 4,  x: 0.015,  y: -0.545, z: 2.030 },
  { index: 5,  x: -0.015, y: -0.545, z: 2.050 },
  { index: 6,  x: -0.040, y: -0.540, z: 2.070 },
  { index: 7,  x: 0.080,  y: -0.520, z: 2.100 },
  { index: 8,  x: -0.075, y: -0.520, z: 2.100 },
  { index: 9,  x: 0.020,  y: -0.500, z: 2.040 },
  { index: 10, x: -0.015, y: -0.500, z: 2.040 },
  { index: 11, x: 0.180,  y: -0.310, z: 2.050 },
  { index: 12, x: -0.175, y: -0.310, z: 2.050 },
  { index: 13, x: 0.265,  y: -0.020, z: 2.075 },
  { index: 14, x: -0.260, y: -0.020, z: 2.075 },
  { index: 15, x: 0.295,  y:  0.260, z: 2.055 },
  { index: 16, x: -0.290, y:  0.260, z: 2.055 },
  { index: 17, x: 0.305,  y:  0.290, z: 2.045 },
  { index: 18, x: -0.300, y:  0.290, z: 2.045 },
  { index: 19, x: 0.315,  y:  0.280, z: 2.035 },
  { index: 20, x: -0.310, y:  0.280, z: 2.035 },
  { index: 21, x: 0.285,  y:  0.275, z: 2.045 },
  { index: 22, x: -0.280, y:  0.275, z: 2.045 },
  { index: 23, x: 0.095,  y:  0.160, z: 2.050 },
  { index: 24, x: -0.090, y:  0.160, z: 2.050 },
  { index: 25, x: 0.100,  y:  0.560, z: 2.050 },
  { index: 26, x: -0.095, y:  0.560, z: 2.050 },
  { index: 27, x: 0.100,  y:  0.920, z: 2.050 },
  { index: 28, x: -0.095, y:  0.920, z: 2.050 },
  { index: 29, x: 0.100,  y:  0.940, z: 2.120 },
  { index: 30, x: -0.095, y:  0.940, z: 2.120 },
  { index: 31, x: 0.095,  y:  0.930, z: 1.950 },
  { index: 32, x: -0.090, y:  0.930, z: 1.950 },
];

const SQUAT_BOTTOM = [
  { index: 0,  x: 0.060,  y: -0.285, z: 1.920 },
  { index: 1,  x: 0.070,  y: -0.300, z: 1.900 },
  { index: 2,  x: 0.080,  y: -0.300, z: 1.920 },
  { index: 3,  x: 0.090,  y: -0.295, z: 1.940 },
  { index: 4,  x: 0.050,  y: -0.300, z: 1.900 },
  { index: 5,  x: 0.020,  y: -0.300, z: 1.920 },
  { index: 6,  x: -0.005, y: -0.295, z: 1.940 },
  { index: 7,  x: 0.115,  y: -0.275, z: 1.970 },
  { index: 8,  x: -0.105, y: -0.275, z: 1.970 },
  { index: 9,  x: 0.060,  y: -0.260, z: 1.910 },
  { index: 10, x: 0.030,  y: -0.260, z: 1.910 },
  { index: 11, x: 0.195,  y: -0.070, z: 1.880 },
  { index: 12, x: -0.190, y: -0.070, z: 1.880 },
  { index: 13, x: 0.320,  y:  0.200, z: 1.830 },
  { index: 14, x: -0.315, y:  0.200, z: 1.830 },
  { index: 15, x: 0.365,  y:  0.440, z: 1.780 },
  { index: 16, x: -0.360, y:  0.440, z: 1.780 },
  { index: 17, x: 0.375,  y:  0.470, z: 1.770 },
  { index: 18, x: -0.370, y:  0.470, z: 1.770 },
  { index: 19, x: 0.385,  y:  0.460, z: 1.760 },
  { index: 20, x: -0.380, y:  0.460, z: 1.760 },
  { index: 21, x: 0.355,  y:  0.455, z: 1.770 },
  { index: 22, x: -0.350, y:  0.455, z: 1.770 },
  { index: 23, x: 0.135,  y:  0.470, z: 1.940 },
  { index: 24, x: -0.130, y:  0.470, z: 1.940 },
  { index: 25, x: 0.230,  y:  0.730, z: 2.155 },
  { index: 26, x: -0.225, y:  0.730, z: 2.155 },
  { index: 27, x: 0.130,  y:  0.910, z: 2.075 },
  { index: 28, x: -0.125, y:  0.910, z: 2.075 },
  { index: 29, x: 0.130,  y:  0.930, z: 2.145 },
  { index: 30, x: -0.125, y:  0.930, z: 2.145 },
  { index: 31, x: 0.125,  y:  0.920, z: 1.975 },
  { index: 32, x: -0.120, y:  0.920, z: 1.975 },
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function interpPose(t) {
  return STANDING.map((s, i) => {
    const sq = SQUAT_BOTTOM[i];
    return {
      index: s.index,
      x_3d_meters: lerp(s.x, sq.x, t),
      y_3d_meters: lerp(s.y, sq.y, t),
      z_3d_meters: lerp(s.z, sq.z, t),
      visibility: 0.99,
    };
  });
}

// 7 frames covering a full squat cycle
export const samplePoseSequence = [
  interpPose(0.00), // 0 standing
  interpPose(0.00), // 1 standing
  interpPose(0.50), // 2 descent
  interpPose(1.00), // 3 bottom  ← BOTTOM frame (index 3)
  interpPose(0.50), // 4 ascent
  interpPose(0.00), // 5 standing
  interpPose(0.00), // 6 standing
];
