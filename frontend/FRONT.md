# Frontend Documentation

## Stack
- React 19 + Vite 7
- Three.js 0.184 · React Three Fiber 9 · Drei 10
- No routing library — screen state managed in `App.jsx`
- All styling is inline CSS (no CSS framework)

## Running
```bash
npm run dev      # → http://localhost:5173
npm run build    # production output in dist/
npm run lint     # ESLint (config in eslint.config.js)
```

## Screen State Machine

```
App.jsx (screen state)
  'welcome'   → WelcomeScreen
  'userinfo'  → UserInfoScreen
  'repselect' → RepSelectScreen
  'analysis'  → AnalysisScreen
```

Props flow down only — no context, no store.

| Prop | Type | Flows to |
|---|---|---|
| `userInfo` | `{ sex, height, weight, unit }` | AnalysisScreen → FeedbackPanel |
| `repData` | `{ poseSequence, metadata, repLabel }` | AnalysisScreen |
| `onReset` | `() => void` | resets all state, returns to welcome |

## Component Responsibilities

### KioskLayout
Renders the fixed header and the animated particle background (`BackgroundCanvas`). All screens are children rendered inside `<main>`.

### BackgroundCanvas
Canvas 2D particle network (55 dots, link distance 140 px). Manages its own `requestAnimationFrame` loop; cleans up on unmount.

### WelcomeScreen
Stateless. Calls `onStart` prop on button click.

### UserInfoScreen
Local state: `sex`, `height` (cm, 140–220), `weight` (kg, 40–150), `unit` (metric/imperial). Passes `{ sex, height, weight, unit }` to `onContinue`.

### RepSelectScreen
- Imports `rep_01.json` and `rep_02.json` as ES module static imports.
- Local state: `selected`, `frameIndex`, `playing`.
- Drives a `setInterval` at 12 fps to advance `frameIndex`. Clears on unmount and on rep change.
- Renders `<PoseSkeleton previewMode={true}>` — all joints cyan, no pulse.
- Passes `{ poseSequence, metadata, repLabel }` to `onAnalyze`.

### AnalysisScreen
- Accepts `poseSequence` prop (falls back to `samplePoseSequence` from `samplePose.js` if null).
- On mount: runs `analyzePosture(seq)` in parallel with a 3.2 s minimum delay, then sets result.
- `selectVisualizationFrame()` picks the BOTTOM frame index from the result; that single frame is rendered.
- Renders: 3D Canvas (left) + FeedbackPanel (right, 300 px fixed width).
- Canvas contains: `HumanModel`, `HeatmapOverlay`, `OrbitControls`, `Grid`.

### HumanModel
GLB loading with silent fallback:
```
GLBErrorBoundary
  └─ Suspense (fallback = PoseSkeleton)
       └─ GLBModelInner  ← useGLTF('/models/human-model.glb')
```
If the file 404s, `GLBErrorBoundary` (class component) catches and renders `PoseSkeleton`. Drop a file at `public/models/human-model.glb` to activate GLB mode.

### PoseSkeleton
**Coordinate transform** (applied inside `transformJoints`):
```
tx = x_3d_meters − centerX
ty = −(y_3d_meters − centerY)   ← negate: MediaPipe +Y=down, Three.js +Y=up
tz = −(z_3d_meters − centerZ)   ← negate: face camera
```

Props:
- `poseFrame` — array of 33 joint objects for one frame
- `heatmapFrame` — array of 36 floats (indices 0–32 = joints, 33–35 = virtual)
- `previewMode` — boolean; if true, all joints render cyan `#22d3ee`, no pulsing

Error joints (`severity ≥ 0.51`) pulse in `useFrame` — scale oscillates ±18%, emissiveIntensity oscillates 0.35–1.2 at 4 rad/s.

### HeatmapOverlay
Floating Drei `<Html>` labels for joints with `severity ≥ 0.51`. Limited to 5 labels to avoid clutter. Only active in result view (not preview).

### FeedbackPanel (300 px sidebar)
- **Score ring**: SVG circle, score = `100 − mistakes.length × 18 − Σ(AI confidence penalties)`. Grade A–F.
- **Detected Issues**: mistake strings as pill badges.
- **AI Confidence bars**: Thoracic, Trunk, Descent, Ascent.
- **Rule Measurements**: Head, Hip, Frontal Knee, Tibial Angle, Foot, Depth — shows `val` vs `threshold` with pass/fail color.
- **Squat Phases**: `phases` dict; BOTTOM shows frame index (`f3`), others show count (`×2`).
- Displays `userInfo` tags (sex, height, weight) when provided.

## Data & Utilities

### src/data/
| File | Contents |
|---|---|
| `samplePose.js` | 7-frame interpolated squat (standing ↔ squat bottom), used as default when no rep selected |
| `rep_01.json` | Real session data, 46 frames, rep #2, subject SESS-0091 |
| `rep_02.json` | Real session data, 68 frames, rep #18, same subject |

### src/utils/
| File | Exports |
|---|---|
| `heatmapUtils.js` | `severityToColor`, `severityLabel`, `selectVisualizationFrame` |
| `poseConnections.js` | `POSE_CONNECTIONS` — 26 pairs of joint indices for skeleton lines |
| `mediapipeMapping.js` | `JOINT_NAMES` (0–35 including virtual), `SQUAT_KEY_JOINTS` |

### src/services/
| File | Purpose |
|---|---|
| `apiClient.js` | `analyzePosture(seq)` — 5 s timeout, auto-fallback to mock |
| `mockData.js` | `getMockAnalysisResult(seq)` — frontend mock, mirrors backend output |

## CSS & Animations
All animation keyframes and utility classes are in `src/index.css`:

| Class | Effect |
|---|---|
| `.fade-in-up` | `fadeInUp` 0.55 s, `cubic-bezier(.22,1,.36,1)` |
| `.fade-in-up-d1/d2/d3/d4` | Same with 0.12/0.24/0.36/0.48 s delay |
| `.fade-in-right` | Slides from right |
| `.float-anim` | Gentle Y bob, 4 s |
| `.btn-glow` | `glowPulse` — blue/purple box-shadow oscillation |
| `.border-glow` | Border color oscillation |

No CSS framework. All component styles are inline objects. `@keyframes` for `spin`, `float`, `gradShift`, `shimmer`, `fadeInUp`, `fadeInRight`, `glowPulse`, `borderGlow` are defined in `index.css`.

## Adding a New Screen
1. Create `src/components/NewScreen.jsx`
2. Add the screen key to `App.jsx` state
3. Add `{screen === 'newscreen' && <NewScreen ... />}` inside `<KioskLayout>`

## Adding a New Rep File
1. Place JSON in `src/data/` with the same structure as `rep_01.json`
2. Import it in `RepSelectScreen.jsx` and add an entry to the `REPS` array
