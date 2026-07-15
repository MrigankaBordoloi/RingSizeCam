# Ring Sizer SDK

Edge-computed ring-size measurement for jewelry e-commerce.  
A shopper points their camera at their hand next to a ₹10 coin, slowly rotates the finger, and receives a ring size with a confidence interval.

> **Phase 1 — Browser Prototype.** All computer vision runs client-side. Zero video frames leave the device.

## Quick Start

### Prerequisites
- Node.js ≥ 18
- pnpm (`npm install -g pnpm`)

### Run

```bash
# Install all workspace dependencies
pnpm install

# Run the demo (opens browser at http://localhost:5173)
pnpm dev

# Run all tests
pnpm test
```

### What you'll see
1. Camera feed with a debug HUD (toggle with **D** key)
2. Place a **₹10 coin** (27 mm diameter) in view → coin detection circle appears
3. Show your **hand** next to the coin → hand landmarks render
4. **Slowly rotate** your ring finger → gated frames accumulate (progress bar)
5. After enough frames → **ring size + confidence interval** displayed

## Project Structure

```
packages/core        # Pure TypeScript — no DOM, no browser APIs
  src/
    types.ts         # Shared types (MeasurementResult, FrameMetadata, etc.)
    config.ts        # All tunable thresholds (single file)
    ramanujan.ts     # Ellipse circumference approximation
    oneEuro.ts       # One Euro signal filter
    scale.ts         # Pixel-to-mm scale computation
    gates.ts         # Per-frame quality gate predicates
    aggregate.ts     # Width distribution → ellipse semi-axes
    sizing.ts        # Circumference → ring size lookup table

apps/web-demo        # Vite + vanilla TypeScript demo
  src/
    main.ts          # Full pipeline wiring
    camera.ts        # getUserMedia (rear camera on mobile)
    handTracker.ts   # MediaPipe HandLandmarker wrapper
    coinDetector.ts  # OpenCV.js Hough circle detection
    widthExtractor.ts # Edge-based finger width measurement
    debugHud.ts      # Toggleable debug overlay (D key)
    stateMachine.ts  # Capture UX state machine
    resultScreen.ts  # Result / retry display
```

## Tuning Thresholds

All thresholds live in [`packages/core/src/config.ts`](packages/core/src/config.ts).  
Adjust while running with the debug HUD (D key) to see the effect in real time:

| Threshold | Default | What it controls |
|-----------|---------|-----------------|
| `minLandmarkConfidence` | 0.7 | MediaPipe detection confidence gate |
| `minBlurScore` | 100 | Variance of Laplacian (higher = sharper) |
| `maxFingerTiltZ` | 0.12 | Max z-delta between ring-finger landmarks 13/14 |
| `minCoinConfidence` | 0.5 | Hough circle detection confidence |
| `minGatedFrames` | 120 | Frames needed before aggregation |
| `oneEuro.minCutoff` | 1.0 | One Euro filter smoothing |
| `oneEuro.beta` | 0.007 | One Euro filter responsiveness |

## Manual Bench Test Protocol

Use this protocol to validate measurement accuracy:

### Setup
1. Get a **rigid cylinder** of known diameter (e.g., a pill bottle, PVC pipe)
2. Measure its diameter precisely with a **caliper or ruler** (record as `D_true`)
3. Place a **₹10 coin** on a flat surface next to the cylinder

### Procedure
1. Open the demo: `pnpm dev`
2. Enable the debug HUD (press **D**)
3. Point the camera at the coin + cylinder from ~20 cm distance
4. Wait for coin detection (green circle appears)
5. Position so the cylinder is where the ring finger would be
6. Let the system sweep and produce a measurement
7. Record the measured circumference → compute `D_measured = C / π`

### Evaluation
```
Error = |D_measured - D_true| / D_true × 100%
```
- **Target**: < 5% error at 20 cm distance
- **Record** lighting conditions, distance, and any gate failures

### Troubleshooting
- If too many frames are gated out: check individual gate status in HUD
- If scale factor fluctuates: coin may be partially occluded or at an angle
- If blur gate fails frequently: improve lighting or hold camera steadier

## License

Proprietary — B2B SDK.
# RingSizeCam
