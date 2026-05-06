# 3D Squat Form Correction Kiosk

## Project Overview

The **3D Squat Form Correction Kiosk** is a gym-based interactive system that analyzes a user's barbell squat posture and displays visual feedback through a 3D human body interface.

The system is designed for a kiosk machine placed in a gym. A user approaches the kiosk, starts a guest session, performs a squat in front of a depth camera, and receives visual feedback showing which body regions performed incorrectly. The main goal is to make squat posture feedback easy to understand by using a 3D human model and red heatmap highlights instead of only text or numerical values.

The frontend is responsible for the kiosk user interface, 3D visualization, body-part highlighting, and user interaction flow. The backend is responsible for receiving pose data, analyzing the squat movement, and returning posture mistakes and joint-level heatmap values.

This project currently prioritizes a **new clean implementation from scratch**. Authentication, permanent profile storage, and database persistence are not required in the first version. The first version should use a **guest session flow**.

---

## Project Goal

The goal of this project is to build a working full-stack prototype that can:

1. Display a kiosk-style frontend interface.
2. Start a guest squat analysis session.
3. Receive or use sample 3D pose data from a depth-camera pipeline.
4. Send the pose sequence to the backend for analysis.
5. Receive posture mistakes and heatmap results.
6. Display a 3D human model or fallback skeleton.
7. Highlight incorrect body regions in red based on backend analysis.

---

## High-Level Architecture

```text
[Gym User]
   ↓
[Depth Camera / Pose Detection System]
   ↓
[Pose Sequence JSON: 33 joints per frame]
   ↓
[FastAPI Backend: POST /analyze]
   ↓
[Squat Analysis Result]
   ↓
[React Frontend Kiosk UI]
   ↓
[3D Human Model + Joint Heatmap Feedback]

The depth camera system produces 3D body landmarks. Each captured frame contains 33 MediaPipe-style joints. A full squat movement is represented as a pose_sequence, which is an array of frames over time.

The frontend sends the pose_sequence to the backend using POST /analyze. The backend analyzes the movement and returns detected mistakes, rule values, squat phases, and a joint_heatmap. The frontend uses this heatmap to highlight incorrect body regions on the 3D visualization.

What Is pose_sequence?

A pose_sequence is a time-based list of human pose frames.

Each frame represents one moment in the squat movement. Each frame contains 33 body joints using the MediaPipe landmark index format.

Example:

{
  "pose_sequence": [
    [
      {
        "index": 0,
        "x_3d_meters": 0.0449,
        "y_3d_meters": -0.6687,
        "z_3d_meters": 2.2730,
        "visibility": 0.9999
      },
      {
        "index": 1,
        "x_3d_meters": 0.0501,
        "y_3d_meters": -0.6902,
        "z_3d_meters": 2.2510,
        "visibility": 0.9991
      }
    ]
  ]
}

In a real squat session, pose_sequence contains many frames:

pose_sequence[0] = first posture frame
pose_sequence[1] = next posture frame
pose_sequence[2] = next posture frame
...

The backend uses this sequence to detect squat phases such as:

START → DESCENT → BOTTOM → ASCENT → FINISH
MediaPipe Joint Mapping

The system uses the standard MediaPipe Pose landmark index mapping.

Index	Joint
0	nose
1	left_eye_inner
2	left_eye
3	left_eye_outer
4	right_eye_inner
5	right_eye
6	right_eye_outer
7	left_ear
8	right_ear
9	mouth_left
10	mouth_right
11	left_shoulder
12	right_shoulder
13	left_elbow
14	right_elbow
15	left_wrist
16	right_wrist
17	left_pinky
18	right_pinky
19	left_index
20	right_index
21	left_thumb
22	right_thumb
23	left_hip
24	right_hip
25	left_knee
26	right_knee
27	left_ankle
28	right_ankle
29	left_heel
30	right_heel
31	left_foot_index
32	right_foot_index

Important joints for squat visualization:

11 = left_shoulder
12 = right_shoulder
23 = left_hip
24 = right_hip
25 = left_knee
26 = right_knee
27 = left_ankle
28 = right_ankle
31 = left_foot_index
32 = right_foot_index

Tech Stack
Frontend: The frontend uses React with Vite. React is used to build the kiosk interface and organize the application into reusable components. Vite is used because it provides fast development startup, fast hot reload, and simple production builds. The 3D rendering layer uses Three.js, React Three Fiber, and Drei. Three.js provides browser-based WebGL rendering. React Three Fiber allows Three.js scenes to be written using React components. Drei provides helper tools such as model loading, orbit controls, camera utilities, and HTML overlays.

Backend: The backend uses FastAPI. FastAPI exposes the /analyze endpoint, receives pose sequence data, and returns posture analysis results. In the first version, the backend may return mock analysis results if the real analysis service is not connected yet.

Database: A database is not required in the first implementation. The first version should use a guest session only, meaning the user does not need an account. Height, weight, and sex are not required for the first build unless needed later for personalized analysis. A future version may use PostgreSQL to store user profiles, session history, squat analysis results, and progress tracking.

Frameworks and Libraries
React: React is used to build the kiosk user interface and organize screens such as welcome, guest session, analysis, 3D visualization, and result summary.

Vite: Vite is used as the frontend build tool. It provides fast local development and simple project configuration.

Three.js: Three.js is used to render the 3D human model, skeleton, joints, lighting, camera, and heatmap visualization.

React Three Fiber: React Three Fiber connects React with Three.js. It allows the 3D scene to be written using React components and state.

Drei: Drei provides helpful components for React Three Fiber, including OrbitControls, useGLTF, Html, and other utilities.

FastAPI: FastAPI is used to build the backend API. It is suitable for structured JSON APIs and can later be expanded to support WebSocket streaming if real-time frame-by-frame feedback is required.

System Flow
The first version should follow this flow:
1. User opens kiosk interface
2. User selects "Start Guest Session"
3. Frontend loads sample or captured pose_sequence
4. Frontend sends pose_sequence to POST /analyze
5. Backend analyzes the squat or returns mock analysis
6. Backend returns mistakes, rule values, phases, and joint_heatmap
7. Frontend renders 3D body visualization
8. Frontend highlights incorrect joints/body parts in red
9. Frontend displays a simple result summary
API Design

POST /analyze

Analyzes a squat pose sequence.

Request Body
{
  "pose_sequence": [
    [
      {
        "index": 0,
        "x_3d_meters": 0.0449,
        "y_3d_meters": -0.6687,
        "z_3d_meters": 2.2730,
        "visibility": 0.9999
      }
    ]
  ]
}
Request Fields
Field	Type	Description
pose_sequence	Array<Array<Object>>	Array of pose frames. Each frame contains 33 joints.
index	number	MediaPipe joint index from 0 to 32.
x_3d_meters	number	X coordinate in meters.
y_3d_meters	number	Y coordinate in meters. Positive Y points downward in the input coordinate system.
z_3d_meters	number	Z coordinate in meters.
visibility	number	Tracking confidence from 0.0 to 1.0.
Response Body
{
  "mistakes": ["Depth", "Trunk"],
  "confidences": {
    "Head": 0.0,
    "Hip": 0.0,
    "Frontal Knee": 0.0,
    "Tibial Angle": 0.0,
    "Foot": 0.0,
    "Depth": 1.0,
    "Thoracic": 0.12,
    "Trunk": 0.88,
    "Descent": 0.05,
    "Ascent": 0.02
  },
  "rule_values": {
    "Head": { "val": 4.2, "threshold": 15.0, "unit": "°" },
    "Hip": { "val": 0.012, "threshold": 0.05, "unit": "m" },
    "Frontal Knee": { "val": 0.008, "threshold": 0.02, "unit": "m" },
    "Tibial Angle": { "val": 3.5, "threshold": 10.0, "unit": "°" },
    "Foot": { "val": 0.002, "threshold": 0.02, "unit": "m" },
    "Depth": { "val": 0.115, "threshold": 0.05, "unit": "m" }
  },
  "phase_per_frame": ["DESCENT", "BOTTOM", "ASCENT"],
  "joint_heatmap": [
    [0.0, 0.0, 0.0, 0.0]
  ],
  "phases": {
    "START": 10,
    "DESCENT": 1,
    "BOTTOM": 1,
    "ASCENT": 1,
    "FINISH": 5
  }
}

Response Fields

mistakes contains detected posture issues such as Depth, Trunk, Head, Hip, Frontal Knee, Tibial Angle, or Foot.
confidences contains raw confidence or severity scores for posture labels.
rule_values contains measured geometric values and thresholds used by the backend.
phase_per_frame contains the squat phase for each input frame.
joint_heatmap contains severity values for each joint. The frontend uses this field to highlight body regions. Values near 0.0 mean normal, while values near 1.0 mean severe issue and should be rendered red.
phases summarizes squat phase detection. BOTTOM should be treated as the most important frame for final visualization if available.

Heatmap Visualization Rules

The frontend should use the backend joint_heatmap to color body regions.

Severity mapping:

0.00 - 0.20 = normal
0.21 - 0.50 = warning
0.51 - 1.00 = error / red highlight

For the first version, the frontend should use the BOTTOM frame heatmap if available. If BOTTOM is unavailable, the frontend should select the frame with the highest average heatmap severity.

The first version does not need perfect muscle-level segmentation. It should highlight joints, skeleton segments, and approximate body regions. A professional muscular GLB model can be added later.

3D Model Strategy

The project should support two visualization modes.

1. Fallback Skeleton Mode

This mode must always work even if no professional 3D model is available.

It should render:

- 33 MediaPipe joints as spheres
- skeleton connections as lines
- red highlights based on joint_heatmap
- feedback text showing detected mistakes

This mode is required for reliable development and debugging.

2. 3D Human Model Mode

This mode should load a GLB or GLTF human model from:

public/models/human-model.glb

The model should ideally be:

- GLB or GLTF format
- low or medium poly
- humanoid
- rigged if future animation is required

If the model file does not exist, the app should automatically fall back to skeleton mode.

Full bone retargeting is not required in the first implementation. The first implementation only needs to display the model and highlight body regions approximately.

Recommended Folder Structure
Final_Project_AI/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── app/
│       ├── api/
│       │   └── analyze.py
│       ├── services/
│       │   └── mock_analysis.py
│       └── models/
│           └── schemas.py
├── public/
│   └── models/
│       └── human-model.glb
├── src/
│   ├── components/
│   │   ├── KioskLayout.jsx
│   │   ├── WelcomeScreen.jsx
│   │   ├── AnalysisScreen.jsx
│   │   ├── HumanModel.jsx
│   │   ├── PoseSkeleton.jsx
│   │   ├── HeatmapOverlay.jsx
│   │   └── FeedbackPanel.jsx
│   ├── data/
│   │   └── samplePose.js
│   ├── services/
│   │   └── apiClient.js
│   ├── utils/
│   │   ├── mediapipeMapping.js
│   │   ├── heatmapUtils.js
│   │   └── poseConnections.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── API_SPEC.md
├── package.json
├── vite.config.js
└── README.md
Frontend Responsibilities

The frontend must:

Render a kiosk-style UI.
Provide a guest session start button.
Load sample pose data during development.
Send pose_sequence to the backend.
Receive the /analyze response.
Render a fallback skeleton visualization.
Load a GLB human model if available.
Highlight incorrect joints or body regions using joint_heatmap.
Display detected mistakes and rule values.
Avoid implementing authentication in the first version.
Backend Responsibilities

The backend must:

Expose POST /analyze.
Accept a pose_sequence request body.
Validate that each frame contains 33 MediaPipe joints.
Return the analysis response format defined above.
Provide a mock analysis response if the real pose analysis service is unavailable.
Avoid implementing a database in the first version.
Setup and Installation
Frontend

Install dependencies:

npm install

Install 3D dependencies:

npm install three @react-three/fiber @react-three/drei

Run frontend:

npm run dev

Frontend URL:

http://localhost:5173
Backend

Create Python environment:

cd backend
python -m venv venv
source venv/bin/activate

Install dependencies:

pip install fastapi uvicorn pydantic

Run backend:

uvicorn main:app --reload

Backend URL:

http://localhost:8000
Environment Variables

Frontend .env:

VITE_API_BASE_URL=http://localhost:8000

Backend .env:

FRONTEND_ORIGIN=http://localhost:5173

A database URL is not required for the first implementation.

Design Decisions

React and Vite are used because the system requires a fast, interactive kiosk frontend. React provides a component-based structure, while Vite provides a fast development workflow.

Three.js, React Three Fiber, and Drei are used because the system requires browser-based 3D visualization. This stack allows the frontend to render joints, skeletons, human models, lighting, camera controls, and heatmap effects directly in the browser.

FastAPI is used because the backend needs to expose a clean JSON API and may later support real-time streaming. It also supports request validation and automatic API documentation.

The first implementation uses guest sessions instead of login because the project’s main technical goal is posture visualization and squat feedback, not account management.

The first implementation avoids database storage because persistent history is not required for the initial kiosk prototype. Database support can be added later after the frontend and analysis flow are stable.

The first implementation includes fallback skeleton mode because professional GLB model selection and rigging may take time. This ensures development can continue even before the final 3D model is ready.

Limitations

The first version does not include authentication, permanent user profiles, or database storage.

The first version does not require full real-time WebSocket streaming. It uses POST /analyze to analyze a complete squat pose sequence.

The first version does not require full bone retargeting from MediaPipe landmarks to a rigged 3D model. This can be added later after the analysis and visualization pipeline works.

The accuracy of the visualization depends on the quality of the backend pose data and the correctness of the returned joint_heatmap.

The final muscular 3D model has not been selected yet. The system must therefore support a fallback skeleton visualization.