# Ring Sizing SDK — Project Context

## What this is
An edge-computed ring-size measurement SDK for jewelry e-commerce (B2B).
A shopper points their camera at their hand next to a reference coin, slowly
rotates the finger, and receives a ring size with a confidence interval.
Distribution targets: embeddable Web Component + React Native package (later phases).

## Non-negotiable constraints (never violate, never "temporarily" bypass)
1. ZERO video frames leave the device. No frame, crop, or image tensor is ever
   sent over the network. All CV runs client-side.
2. `packages/core` is framework-agnostic pure TypeScript: no DOM, no browser
   APIs, no React. It must port to React Native unchanged.
3. MediaPipe WORLD_LANDMARKS are NEVER used as the metric scale source.
   The scale anchor is a physical reference object (Phase 1: ₹10 coin, 27.00 mm
   diameter). World landmarks may only be logged for later use as a weak prior.
4. Every measurement result is `{ value, confidenceInterval }` — never a bare
   number. If frame quality is too poor to compute a CI, the correct output is
   a re-measure prompt, not a guess.
5. TypeScript strict mode. Every pure-math module has unit tests before it is
   used by the pipeline.
6. Do not add dependencies beyond the approved list without asking.

## Approved stack
- MediaPipe Tasks Vision (`@mediapipe/tasks-vision`) — hand landmarks only
- OpenCV.js — coin detection (Hough circles) + image ops (prototype only;
  bundle size is a known issue, do not optimize it yet)
- Vite + vanilla TypeScript for the demo app (no React in the demo)
- Vitest for tests, pnpm workspaces for the monorepo

## Pipeline (decided architecture — do not re-litigate)
1. Anchor detection: find the ₹10 coin → scale S = coin_px_diameter / 27.00 (px/mm)
2. Hand landmark detection (MediaPipe) → ROI around ring-finger proximal segment
3. Per-frame quality gates (drop bad frames BEFORE aggregation):
   - MediaPipe landmark confidence < 0.7
   - Blur: variance of Laplacian on ROI below threshold (expose in debug HUD)
   - Coin partially out of frame or Hough confidence low
   - Finger tilt heuristic (relative z of landmarks 13/14) beyond threshold
4. Boundary: edge extraction across the finger inside the ROI → width in px
   → width_mm = width_px / S
5. One Euro filter on width_mm stream (mincutoff = 1.0, beta = 0.007 initial)
6. Aggregation over a guided ~4s rotation sweep (target ≥ 120 gated frames):
   - Phase 1 simplification: semi-major a = P95(width)/2, semi-minor b = P5(width)/2
   - (Phase 2 upgrade: least-squares fit of w(θ) = 2√(a²cos²θ + b²sin²θ))
7. Circumference via Ramanujan: C ≈ π · [3(a+b) − √((3a+b)(a+3b))]
   — a and b are SEMI-axes. Passing full widths here is the classic bug.
8. Size mapping: circumference → ring size via a data table with linear
   interpolation. Seed with a standard US/ISO chart; the table is swappable
   config (merchants deviate from standard charts), never a hardcoded formula.

## Capture UX state machine
IDLE → ANCHOR_DETECTED → HAND_DETECTED → SWEEPING (progress meter: gated-frame
count) → COMPUTING → RESULT | RETRY. RESULT screen shows size, CI, and a
re-measure button. If CI spans more than one full size → force RETRY message.

## Repo layout
- packages/core        # pure TS: scale.ts, gates.ts, oneEuro.ts, aggregate.ts,
                       # ramanujan.ts, sizing.ts, types.ts + tests
- apps/web-demo        # Vite demo: camera, MediaPipe, OpenCV.js, debug HUD
- (later) packages/web-component, packages/react-native, backend/

## Definition of done for any task
- Unit tests pass (`pnpm test`)
- Demo runs with `pnpm i && pnpm dev`, no console errors
- README run instructions updated
- No mocked/stubbed CV presented as working — if a model fails to load,
  fix the loading, do not fake the data

