# Ring Sizer SDK

Edge-computed ring-size measurement for jewelry e-commerce.  
A shopper points their camera at their hand next to a ₹10 coin or credit card, slowly rotates the finger, and receives a ring size with a confidence interval.

> **Phase 3 — Embeddable Web Component.** All computer vision runs client-side. Zero video frames leave the device. The full capture pipeline is packaged as a `<ring-sizer>` custom element (`packages/web-component`) that any page can embed with one tag.

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
1. A `<ring-sizer>` embed with a debug HUD (toggle with **D** key)
2. Place a **₹10 coin** (27 mm diameter) **or a credit card** in view → whichever is detected with higher confidence anchors the scale
3. Show your **hand** next to it → hand landmarks render
4. **Slowly rotate** your ring finger → gated frames accumulate (progress bar), θ (rotation) coverage climbs in the HUD
5. After enough frames → **ring size + confidence interval** displayed, and a `result` (or `retry`) event fires — watch the event log panel below the embed
6. Click **Unmount ring-sizer** to prove the component tears itself down cleanly (camera light off, frame loop stopped), then click again to remount

## Embedding `<ring-sizer>`

The entire capture pipeline is a single custom element. A host page needs
nothing else — no manual OpenCV `<script>` tag, no pipeline markup:

```html
<script type="module">
  import '@ring-sizer/web-component';
</script>

<ring-sizer
  api-key="YOUR_API_KEY"
  locale="en-US"
  size-chart-id="us-default"
></ring-sizer>

<script type="module">
  const ringSizer = document.querySelector('ring-sizer');

  ringSizer.addEventListener('result', (e) => {
    // e.detail: { value, label, confidenceInterval, method, thetaCoverageDeg,
    //             apiKey, sessionId, locale, sizeChartId }
    console.log('Measured size:', e.detail.label, e.detail);
  });

  ringSizer.addEventListener('retry', (e) => {
    // e.detail: { reason: 'insufficient-frames' | 'ci-too-wide',
    //             confidenceInterval, apiKey, sessionId, locale, sizeChartId }
    console.log('Re-measure needed:', e.detail.reason);
  });

  ringSizer.addEventListener('error', (e) => {
    // e.detail: { message, stage: 'camera' | 'hand-tracker' | 'opencv',
    //             apiKey, sessionId, locale, sizeChartId }
    console.error('ring-sizer error:', e.detail.message);
  });
</script>
```

### Attributes

| Attribute | Required | Description |
|-----------|----------|--------------|
| `api-key` | No | Accepted and attached to every emitted event's detail for downstream telemetry. **Not validated** — no backend exists yet. |
| `locale` | No | BCP-47 locale tag, passed through on event detail (default `en-US`). |
| `size-chart-id` | No | Selects the size table: `us-default`, `eu-default`, or `uk-default` (default `us-default`). Unknown ids warn to console and fall back to `us-default`. Merchants can register their own via `registerSizeChart(id, table)` (exported from `@ring-sizer/web-component`) before the element upgrades. |

> **`uk-default` caveat:** the UK/Ireland letter-grade chart is an
> approximation, constructed from one well-established anchor point (UK
> "N" ≈ US 7) plus a standard per-letter mm step — it is **not** verbatim
> BS 6748 data. Verify against an authoritative source before
> production/commercial use.

## Project Structure

```
packages/core            # Pure TypeScript — no DOM, no browser APIs
  src/
    types.ts             # Shared types (MeasurementResult, FrameMetadata, etc.)
    config.ts            # All tunable thresholds (single file)
    ramanujan.ts         # Ellipse circumference approximation
    oneEuro.ts           # One Euro signal filter
    scale.ts             # Pixel-to-mm scale (coin or card anchor)
    gates.ts             # Per-frame quality gate predicates
    aggregate.ts         # Width distribution → ellipse semi-axes (least-squares + percentile fallback)
    rotation.ts          # Finger rotation angle (θ) estimation
    sizing.ts            # Circumference → ring size lookup table + label snapping

packages/web-component   # <ring-sizer> custom element (Shadow DOM)
  src/
    RingSizerElement.ts  # Custom element: lifecycle, frame loop, events
    index.ts             # Barrel — importing this registers <ring-sizer>
    template.ts          # Shadow DOM markup + scoped styles
    events.ts            # result/retry/error CustomEvent detail types
    telemetry.ts         # Session id + api-key event-detail context
    sizeCharts.ts        # size-chart-id registry (us/eu/uk-default)
    opencvLoader.ts      # Self-injects OpenCV.js into the host page
    camera.ts            # getUserMedia (rear camera on mobile)
    handTracker.ts       # MediaPipe HandLandmarker wrapper
    coinDetector.ts      # OpenCV.js Hough circle detection
    cardDetector.ts      # OpenCV.js quad detection (credit-card anchor)
    anchorSelector.ts    # Picks coin vs card by confidence
    widthExtractor.ts    # Edge-based finger width measurement
    debugHud.ts          # Toggleable debug overlay (D key)
    stateMachine.ts      # Capture UX state machine
    resultScreen.ts      # Result / retry display

apps/web-demo            # Thin Vite page that consumes <ring-sizer>
  src/main.ts             # Mounts the element, logs its events
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
