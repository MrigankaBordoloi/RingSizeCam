// ──────────────────────────────────────────────────────────────
// main.ts — Entry point for the ring-sizing web demo.
// Wires together: camera, MediaPipe, OpenCV.js anchor detection
// (coin + card, auto-selected), width extraction, quality gates,
// One Euro filter, theta estimation, state machine, debug HUD,
// and result screen.
// ──────────────────────────────────────────────────────────────

import {
  DEFAULT_CONFIG,
  OneEuroFilter,
  checkGates,
  aggregateWidths,
  ellipseCircumference,
  circumferenceToSize,
  estimateFingerTheta,
  thetaCoverage,
  type FrameMetadata,
  type PipelineConfig,
} from '@ring-sizer/core';

import { initCamera } from './camera.js';
import { initHandTracker, detectHands, drawLandmarks, getHandConfidence, RING_FINGER, MIDDLE_MCP } from './handTracker.js';
import { isOpenCvReady, drawCoinOverlay } from './coinDetector.js';
import { drawCardOverlay } from './cardDetector.js';
import { selectAnchor, type AnchorResult } from './anchorSelector.js';
import { extractFingerWidth, computeFingerTilt } from './widthExtractor.js';
import { initHudToggle, renderHud, type HudData } from './debugHud.js';
import { createInitialContext, advanceState, getStateBanner, resetState, type StateContext } from './stateMachine.js';
import { showResult, hideResult, initRemeasureButton } from './resultScreen.js';

// ── Config (single source of truth) ──
const config: PipelineConfig = { ...DEFAULT_CONFIG };

// ── DOM elements ──
const video = document.getElementById('camera-feed') as HTMLVideoElement;
const overlayCanvas = document.getElementById('overlay-canvas') as HTMLCanvasElement;
const overlayCtx = overlayCanvas.getContext('2d')!;
const stateBanner = document.getElementById('state-banner')!;
const progressContainer = document.getElementById('progress-container')!;
const progressBar = document.getElementById('progress-bar')!;
const progressLabel = document.getElementById('progress-label')!;
const loadingEl = document.getElementById('loading')!;
const loadingText = document.getElementById('loading-text')!;

// ── Scratch canvas for OpenCV operations (never displayed) ──
const scratchCanvas = document.createElement('canvas');

// ── Pipeline state ──
let stateCtx: StateContext = createInitialContext();
const oneEuroFilter = new OneEuroFilter(config.oneEuro);
let currentScale = 0;
let lastFrameTime = 0;
let fps = 0;
let frameCount = 0;
let fpsTimer = performance.now();

// ── Initialization ──
async function init(): Promise<void> {
  try {
    // 1. Camera
    loadingText.textContent = 'Initializing camera…';
    await initCamera(video);

    // 2. MediaPipe
    loadingText.textContent = 'Loading hand landmark model…';
    await initHandTracker();

    // 3. Wait for OpenCV.js
    loadingText.textContent = 'Loading OpenCV.js…';
    await waitForOpenCv();

    // 4. Set up UI
    initHudToggle();
    initRemeasureButton(handleRemeasure);

    // Size overlay canvas to match video
    resizeOverlay();
    window.addEventListener('resize', resizeOverlay);
    video.addEventListener('resize', resizeOverlay);

    // Hide loading screen
    loadingEl.style.display = 'none';

    // 5. Start frame loop
    requestAnimationFrame(processFrame);
  } catch (err) {
    loadingText.textContent = `Error: ${err instanceof Error ? err.message : String(err)}`;
    console.error('Initialization failed:', err);
  }
}

function waitForOpenCv(timeoutMs = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isOpenCvReady()) {
      resolve();
      return;
    }

    const start = Date.now();
    const check = () => {
      if (isOpenCvReady()) {
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        reject(new Error('OpenCV.js failed to load within timeout'));
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

function resizeOverlay(): void {
  overlayCanvas.width = video.videoWidth || video.clientWidth;
  overlayCanvas.height = video.videoHeight || video.clientHeight;
}

// ── Frame processing loop ──
function processFrame(timestamp: number): void {
  // FPS tracking
  frameCount++;
  if (timestamp - fpsTimer >= 1000) {
    fps = frameCount;
    frameCount = 0;
    fpsTimer = timestamp;
  }

  if (video.readyState < 2) {
    requestAnimationFrame(processFrame);
    return;
  }

  // Ensure overlay is sized
  if (overlayCanvas.width !== video.videoWidth) {
    resizeOverlay();
  }

  // Clear overlay
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  // Skip processing if we're in a terminal state
  if (stateCtx.state === 'RESULT' || stateCtx.state === 'RETRY') {
    requestAnimationFrame(processFrame);
    return;
  }

  // ── 1. Anchor detection (coin or card, auto-selected by confidence) ──
  const anchor: AnchorResult = selectAnchor(video, scratchCanvas, config);
  const anchorDetected = anchor.confidence > 0;

  if (anchor.scalePxMm > 0) {
    currentScale = anchor.scalePxMm;
  }
  if (anchor.type === 'coin' && anchor.coin) {
    drawCoinOverlay(
      overlayCtx, anchor.coin, currentScale,
      overlayCanvas.width, overlayCanvas.height,
      video.videoWidth, video.videoHeight,
    );
  } else if (anchor.type === 'card' && anchor.card) {
    drawCardOverlay(
      overlayCtx, anchor.card, currentScale,
      overlayCanvas.width, overlayCanvas.height,
      video.videoWidth, video.videoHeight,
    );
  }

  // ── 2. Hand landmark detection ──
  const handResult = detectHands(video, timestamp);
  const handDetected = !!(handResult?.landmarks && handResult.landmarks.length > 0);
  const handConfidence = handResult ? getHandConfidence(handResult) : 0;

  if (handResult) {
    drawLandmarks(overlayCtx, handResult, overlayCanvas.width, overlayCanvas.height);
  }

  // ── 3. Width extraction ──
  let rawWidthMm = 0;
  let filteredWidthMm = 0;
  let blurScore = 0;
  let fingerTiltZ = 0;

  if (handDetected && currentScale > 0 && handResult?.landmarks?.[0]) {
    const landmarks = handResult.landmarks[0];
    const measurement = extractFingerWidth(landmarks, video, scratchCanvas, currentScale);

    if (measurement) {
      rawWidthMm = measurement.widthMm;
      blurScore = measurement.blurScore;
      filteredWidthMm = oneEuroFilter.filter(rawWidthMm, timestamp / 1000);
    }

    fingerTiltZ = computeFingerTilt(landmarks);
  }

  // ── 3b. Rotation angle (theta) estimation ──
  let thetaRad: number | null = null;
  if (handDetected && handResult?.landmarks?.[0]) {
    const lm = handResult.landmarks[0];
    const ringMcp = lm[RING_FINGER.MCP];
    const ringPip = lm[RING_FINGER.PIP];
    const middleMcp = lm[MIDDLE_MCP];
    if (ringMcp && ringPip && middleMcp) {
      thetaRad = estimateFingerTheta(
        { x: ringMcp.x, y: ringMcp.y, z: ringMcp.z ?? 0 },
        { x: ringPip.x, y: ringPip.y, z: ringPip.z ?? 0 },
        { x: middleMcp.x, y: middleMcp.y, z: middleMcp.z ?? 0 },
      );
    }
  }

  // ── 4. Quality gates ──
  const frameMeta: FrameMetadata = {
    landmarkConfidence: handConfidence,
    blurScore,
    coinInFrame: anchor.inFrame,
    coinConfidence: anchor.confidence,
    fingerTiltZ,
    anchorType: anchor.type,
  };
  const gateResult = checkGates(frameMeta, config);

  // ── 5. State machine ──
  const frameInput = {
    anchorDetected,
    handDetected,
    gatePassed: gateResult.passed && rawWidthMm > 0,
    filteredWidthMm,
    theta: thetaRad,
  };

  stateCtx = advanceState(stateCtx, frameInput, config.minGatedFrames);

  // ── 6. Handle COMPUTING state ──
  if (stateCtx.state === 'COMPUTING') {
    computeResult();
  }

  // ── 7. Update UI ──
  updateUI(frameMeta, gateResult.passed, gateResult.reasons, rawWidthMm, filteredWidthMm);

  // ── Next frame ──
  lastFrameTime = timestamp;
  requestAnimationFrame(processFrame);
}

// ── Compute the final result ──
function computeResult(): void {
  const { gatedWidths, observations } = stateCtx;

  if (gatedWidths.length < 2) {
    stateCtx = { ...stateCtx, state: 'RETRY', retryForced: true, result: null };
    showResult({ value: 0, confidenceInterval: [0, 0] }, true);
    return;
  }

  // Aggregate: least-squares ellipse fit when theta coverage is sufficient,
  // percentile (P95/2 = semi-major, P5/2 = semi-minor) fallback otherwise.
  const agg = aggregateWidths(gatedWidths, observations, config.minThetaCoverageDeg);
  const { a, b, method, thetaCoverageDeg } = agg;

  // Circumference via Ramanujan (a, b are already semi-axes)
  const circumference = ellipseCircumference(a, b);

  // CI: compute circumference range from width variability
  // Use P90/P10 for a slightly narrower CI bound
  const sorted = [...gatedWidths].sort((x, y) => x - y);
  const p10 = sorted[Math.floor(sorted.length * 0.1)]!;
  const p90 = sorted[Math.floor(sorted.length * 0.9)]!;
  const aLo = p90 / 2; // semi-major from lower bound
  const bLo = p10 / 2;
  // The CI comes from the range of possible circumferences
  const circumLo = ellipseCircumference(bLo, bLo); // smallest circle (minor axis)
  const circumHi = ellipseCircumference(aLo, aLo); // largest circle (major axis)

  const result = circumferenceToSize(circumference, [circumLo, circumHi]);

  // Check if CI is too wide (spans > maxCISizeSpan full sizes)
  const ciSpan = result.confidenceInterval[1] - result.confidenceInterval[0];
  const isRetry = ciSpan > config.maxCISizeSpan;

  stateCtx = {
    ...stateCtx,
    state: isRetry ? 'RETRY' : 'RESULT',
    result,
    retryForced: isRetry,
    aggMethod: method,
    thetaCoverageDeg,
  };

  showResult(result, isRetry);
}

// ── Re-measure handler ──
function handleRemeasure(): void {
  stateCtx = resetState();
  currentScale = 0;
  hideResult();
}

// ── UI updates ──
function updateUI(
  meta: FrameMetadata,
  gatesPassed: boolean,
  gateReasons: string[],
  rawWidthMm: number,
  filteredWidthMm: number,
): void {
  // State banner
  const banner = getStateBanner(stateCtx.state, meta.anchorType);
  stateBanner.textContent = banner.text;
  stateBanner.style.background = banner.color;

  // Progress bar (only in SWEEPING)
  const isSweeping = stateCtx.state === 'SWEEPING';
  progressContainer.style.display = isSweeping ? 'block' : 'none';
  progressLabel.style.display = isSweeping ? 'block' : 'none';

  if (isSweeping) {
    const progress = Math.min(100, (stateCtx.gatedWidths.length / config.minGatedFrames) * 100);
    progressBar.style.width = `${progress}%`;
    progressLabel.textContent = `${stateCtx.gatedWidths.length} / ${config.minGatedFrames} gated frames`;
  }

  // θ coverage: live during SWEEPING, frozen at the final value once computed.
  const isTerminal = stateCtx.state === 'RESULT' || stateCtx.state === 'RETRY';
  const liveThetaCoverageDeg =
    stateCtx.observations.length >= 2
      ? thetaCoverage(stateCtx.observations.map((o) => o.thetaRad))
      : 0;

  // Debug HUD
  const hudData: HudData = {
    state: stateCtx.state,
    coinDetected: meta.coinInFrame || meta.coinConfidence > 0,
    coinConfidence: meta.coinConfidence,
    coinInFrame: meta.coinInFrame,
    scalePxMm: currentScale,
    handDetected: meta.landmarkConfidence > 0,
    landmarkConfidence: meta.landmarkConfidence,
    rawWidthMm,
    filteredWidthMm,
    blurScore: meta.blurScore,
    fingerTiltZ: meta.fingerTiltZ,
    gatesPassed,
    gateReasons,
    gatedFrameCount: stateCtx.gatedWidths.length,
    targetFrames: config.minGatedFrames,
    fps,
    anchorType: meta.anchorType,
    thetaCoverageDeg: isTerminal ? stateCtx.thetaCoverageDeg : liveThetaCoverageDeg,
    aggregationMethod: isTerminal ? stateCtx.aggMethod : null,
    minThetaCoverageDeg: config.minThetaCoverageDeg,
  };
  renderHud(hudData);
}

// ── Start ──
init();
