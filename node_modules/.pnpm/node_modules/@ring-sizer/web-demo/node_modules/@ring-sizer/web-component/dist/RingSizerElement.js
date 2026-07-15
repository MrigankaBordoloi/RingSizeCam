// ──────────────────────────────────────────────────────────────
// RingSizerElement.ts — <ring-sizer> custom element. Shadow DOM
// wraps the full capture pipeline: camera, MediaPipe, OpenCV.js
// anchor detection, width extraction, quality gates, One Euro
// filter, theta estimation, state machine, debug HUD, result screen.
// Configured via attributes: api-key, locale, size-chart-id.
// Emits CustomEvents: 'result', 'retry', 'error'.
// ──────────────────────────────────────────────────────────────
import { DEFAULT_CONFIG, OneEuroFilter, checkGates, aggregateWidths, ellipseCircumference, circumferenceToSize, nearestSizeLabel, estimateFingerTheta, thetaCoverage, } from '@ring-sizer/core';
import { initCamera } from './camera.js';
import { initHandTracker, detectHands, drawLandmarks, getHandConfidence, RING_FINGER, MIDDLE_MCP, } from './handTracker.js';
import { isOpenCvReady, drawCoinOverlay } from './coinDetector.js';
import { drawCardOverlay } from './cardDetector.js';
import { selectAnchor } from './anchorSelector.js';
import { extractFingerWidth, computeFingerTilt } from './widthExtractor.js';
import { initHudToggle, renderHud } from './debugHud.js';
import { createInitialContext, advanceState, getStateBanner, resetState, } from './stateMachine.js';
import { showResult, hideResult, initRemeasureButton } from './resultScreen.js';
import { injectOpenCvScriptOnce } from './opencvLoader.js';
import { getSizeChart } from './sizeCharts.js';
import { createSessionId, buildEventDetail } from './telemetry.js';
import { buildShadowContent } from './template.js';
export class RingSizerElement extends HTMLElement {
    static get observedAttributes() {
        return ['api-key', 'locale', 'size-chart-id'];
    }
    #sessionId;
    #apiKey = null;
    #locale = 'en-US';
    #sizeChartId = 'us-default';
    #generation = 0;
    #rafHandle = null;
    #mediaStream = null;
    #removeHudListener = null;
    #els = null;
    #stateCtx = createInitialContext();
    #oneEuroFilter = null;
    #currentScale = 0;
    #config = { ...DEFAULT_CONFIG };
    #scratchCanvas = document.createElement('canvas');
    #fps = 0;
    #frameCount = 0;
    #fpsTimer = 0;
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.#sessionId = createSessionId();
    }
    get apiKey() {
        return this.#apiKey;
    }
    get locale() {
        return this.#locale;
    }
    get sizeChartId() {
        return this.#sizeChartId;
    }
    attributeChangedCallback(name, _old, val) {
        if (name === 'api-key')
            this.#apiKey = val;
        else if (name === 'locale')
            this.#locale = val ?? 'en-US';
        // size-chart-id is read fresh by #computeResult() on every measurement,
        // so updating it here safely affects only the *next* result.
        else if (name === 'size-chart-id')
            this.#sizeChartId = val ?? 'us-default';
    }
    connectedCallback() {
        const myGeneration = ++this.#generation;
        // Reconnecting always tears down and rebuilds fully (camera permission
        // re-prompted, state resets to IDLE) rather than pausing/resuming a
        // live session — simplest correct behavior for this phase.
        this.#stateCtx = createInitialContext();
        this.#oneEuroFilter = new OneEuroFilter(this.#config.oneEuro);
        this.#currentScale = 0;
        this.shadowRoot.innerHTML = buildShadowContent();
        this.#els = this.#queryShadowEls();
        injectOpenCvScriptOnce();
        this.#removeHudListener = initHudToggle(this.shadowRoot);
        initRemeasureButton(() => this.#handleRemeasure(), this.shadowRoot);
        void this.#startPipeline(myGeneration);
    }
    disconnectedCallback() {
        this.#generation++;
        if (this.#rafHandle !== null) {
            cancelAnimationFrame(this.#rafHandle);
            this.#rafHandle = null;
        }
        this.#mediaStream?.getTracks().forEach((track) => track.stop());
        this.#mediaStream = null;
        this.#removeHudListener?.();
        this.#removeHudListener = null;
        window.removeEventListener('resize', this.#resizeOverlay);
        this.#els?.video.removeEventListener('resize', this.#resizeOverlay);
        this.#els = null;
        this.shadowRoot.replaceChildren();
    }
    #queryShadowEls() {
        const root = this.shadowRoot;
        const video = root.getElementById('camera-feed');
        const overlayCanvas = root.getElementById('overlay-canvas');
        return {
            video,
            overlayCanvas,
            overlayCtx: overlayCanvas.getContext('2d'),
            stateBanner: root.getElementById('state-banner'),
            progressContainer: root.getElementById('progress-container'),
            progressBar: root.getElementById('progress-bar'),
            progressLabel: root.getElementById('progress-label'),
            loadingEl: root.getElementById('loading'),
            loadingText: root.getElementById('loading-text'),
        };
    }
    async #startPipeline(myGeneration) {
        const els = this.#els;
        let stage = 'camera';
        try {
            els.loadingText.textContent = 'Initializing camera…';
            const stream = await initCamera(els.video);
            if (myGeneration !== this.#generation) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }
            this.#mediaStream = stream;
            stage = 'hand-tracker';
            els.loadingText.textContent = 'Loading hand landmark model…';
            await initHandTracker();
            if (myGeneration !== this.#generation)
                return;
            stage = 'opencv';
            els.loadingText.textContent = 'Loading OpenCV.js…';
            await this.#waitForOpenCv(myGeneration);
            if (myGeneration !== this.#generation)
                return;
            this.#resizeOverlay();
            window.addEventListener('resize', this.#resizeOverlay);
            els.video.addEventListener('resize', this.#resizeOverlay);
            els.loadingEl.style.display = 'none';
            this.#fpsTimer = performance.now();
            this.#rafHandle = requestAnimationFrame(this.#processFrame);
        }
        catch (err) {
            if (myGeneration !== this.#generation)
                return;
            const message = err instanceof Error ? err.message : String(err);
            els.loadingText.textContent = `Error: ${message}`;
            console.error('[ring-sizer] Initialization failed:', err);
            this.#emitError(message, stage, err);
        }
    }
    #waitForOpenCv(myGeneration, timeoutMs = 30000) {
        return new Promise((resolve, reject) => {
            if (isOpenCvReady()) {
                resolve();
                return;
            }
            const start = Date.now();
            const check = () => {
                if (myGeneration !== this.#generation) {
                    resolve(); // stale connection — stop polling silently, not an error
                    return;
                }
                if (isOpenCvReady()) {
                    resolve();
                }
                else if (Date.now() - start > timeoutMs) {
                    reject(new Error('OpenCV.js failed to load within timeout'));
                }
                else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }
    #resizeOverlay = () => {
        const els = this.#els;
        if (!els)
            return;
        els.overlayCanvas.width = els.video.videoWidth || els.video.clientWidth;
        els.overlayCanvas.height = els.video.videoHeight || els.video.clientHeight;
    };
    #processFrame = (timestamp) => {
        const els = this.#els;
        if (!els)
            return;
        this.#frameCount++;
        if (timestamp - this.#fpsTimer >= 1000) {
            this.#fps = this.#frameCount;
            this.#frameCount = 0;
            this.#fpsTimer = timestamp;
        }
        if (els.video.readyState < 2) {
            this.#rafHandle = requestAnimationFrame(this.#processFrame);
            return;
        }
        if (els.overlayCanvas.width !== els.video.videoWidth) {
            this.#resizeOverlay();
        }
        els.overlayCtx.clearRect(0, 0, els.overlayCanvas.width, els.overlayCanvas.height);
        if (this.#stateCtx.state === 'RESULT' || this.#stateCtx.state === 'RETRY') {
            this.#rafHandle = requestAnimationFrame(this.#processFrame);
            return;
        }
        // 1. Anchor detection (coin or card, auto-selected by confidence)
        const anchor = selectAnchor(els.video, this.#scratchCanvas, this.#config);
        const anchorDetected = anchor.confidence > 0;
        if (anchor.scalePxMm > 0) {
            this.#currentScale = anchor.scalePxMm;
        }
        if (anchor.type === 'coin' && anchor.coin) {
            drawCoinOverlay(els.overlayCtx, anchor.coin, this.#currentScale, els.overlayCanvas.width, els.overlayCanvas.height, els.video.videoWidth, els.video.videoHeight);
        }
        else if (anchor.type === 'card' && anchor.card) {
            drawCardOverlay(els.overlayCtx, anchor.card, this.#currentScale, els.overlayCanvas.width, els.overlayCanvas.height, els.video.videoWidth, els.video.videoHeight);
        }
        // 2. Hand landmark detection
        const handResult = detectHands(els.video, timestamp);
        const handDetected = !!(handResult?.landmarks && handResult.landmarks.length > 0);
        const handConfidence = handResult ? getHandConfidence(handResult) : 0;
        if (handResult) {
            drawLandmarks(els.overlayCtx, handResult, els.overlayCanvas.width, els.overlayCanvas.height);
        }
        // 3. Width extraction
        let rawWidthMm = 0;
        let filteredWidthMm = 0;
        let blurScore = 0;
        let fingerTiltZ = 0;
        if (handDetected && this.#currentScale > 0 && handResult?.landmarks?.[0]) {
            const landmarks = handResult.landmarks[0];
            const measurement = extractFingerWidth(landmarks, els.video, this.#scratchCanvas, this.#currentScale);
            if (measurement) {
                rawWidthMm = measurement.widthMm;
                blurScore = measurement.blurScore;
                filteredWidthMm = this.#oneEuroFilter.filter(rawWidthMm, timestamp / 1000);
            }
            fingerTiltZ = computeFingerTilt(landmarks);
        }
        // 3b. Rotation angle (theta) estimation
        let thetaRad = null;
        if (handDetected && handResult?.landmarks?.[0]) {
            const lm = handResult.landmarks[0];
            const ringMcp = lm[RING_FINGER.MCP];
            const ringPip = lm[RING_FINGER.PIP];
            const middleMcp = lm[MIDDLE_MCP];
            if (ringMcp && ringPip && middleMcp) {
                thetaRad = estimateFingerTheta({ x: ringMcp.x, y: ringMcp.y, z: ringMcp.z ?? 0 }, { x: ringPip.x, y: ringPip.y, z: ringPip.z ?? 0 }, { x: middleMcp.x, y: middleMcp.y, z: middleMcp.z ?? 0 });
            }
        }
        // 4. Quality gates
        const frameMeta = {
            landmarkConfidence: handConfidence,
            blurScore,
            coinInFrame: anchor.inFrame,
            coinConfidence: anchor.confidence,
            fingerTiltZ,
            anchorType: anchor.type,
        };
        const gateResult = checkGates(frameMeta, this.#config);
        // 5. State machine
        const frameInput = {
            anchorDetected,
            handDetected,
            gatePassed: gateResult.passed && rawWidthMm > 0,
            filteredWidthMm,
            theta: thetaRad,
        };
        this.#stateCtx = advanceState(this.#stateCtx, frameInput, this.#config.minGatedFrames);
        // 6. Handle COMPUTING state
        if (this.#stateCtx.state === 'COMPUTING') {
            this.#computeResult();
        }
        // 7. Update UI
        this.#updateUI(frameMeta, gateResult.passed, gateResult.reasons, rawWidthMm, filteredWidthMm);
        this.#rafHandle = requestAnimationFrame(this.#processFrame);
    };
    #computeResult() {
        const { gatedWidths, observations } = this.#stateCtx;
        const table = getSizeChart(this.#sizeChartId);
        if (gatedWidths.length < 2) {
            this.#stateCtx = { ...this.#stateCtx, state: 'RETRY', retryForced: true, result: null };
            showResult(true, null, this.shadowRoot);
            this.#emitRetry('insufficient-frames', null);
            return;
        }
        // Aggregate: least-squares ellipse fit when theta coverage is sufficient,
        // percentile (P95/2 = semi-major, P5/2 = semi-minor) fallback otherwise.
        const agg = aggregateWidths(gatedWidths, observations, this.#config.minThetaCoverageDeg);
        const { a, b, method, thetaCoverageDeg } = agg;
        const circumference = ellipseCircumference(a, b);
        // CI: compute circumference range from width variability (P90/P10).
        const sorted = [...gatedWidths].sort((x, y) => x - y);
        const p10 = sorted[Math.floor(sorted.length * 0.1)];
        const p90 = sorted[Math.floor(sorted.length * 0.9)];
        const aLo = p90 / 2;
        const bLo = p10 / 2;
        const circumLo = ellipseCircumference(bLo, bLo);
        const circumHi = ellipseCircumference(aLo, aLo);
        const result = circumferenceToSize(circumference, [circumLo, circumHi], table);
        const labels = {
            value: nearestSizeLabel(result.value, table),
            lo: nearestSizeLabel(result.confidenceInterval[0], table),
            hi: nearestSizeLabel(result.confidenceInterval[1], table),
        };
        const ciSpan = result.confidenceInterval[1] - result.confidenceInterval[0];
        const isRetry = ciSpan > this.#config.maxCISizeSpan;
        this.#stateCtx = {
            ...this.#stateCtx,
            state: isRetry ? 'RETRY' : 'RESULT',
            result,
            retryForced: isRetry,
            aggMethod: method,
            thetaCoverageDeg,
        };
        showResult(isRetry, labels, this.shadowRoot);
        if (isRetry) {
            this.#emitRetry('ci-too-wide', result.confidenceInterval);
        }
        else {
            this.#emit('result', buildEventDetail(this.#telemetryContext(), {
                value: result.value,
                label: labels.value,
                confidenceInterval: result.confidenceInterval,
                method,
                thetaCoverageDeg,
            }));
        }
    }
    #handleRemeasure() {
        this.#stateCtx = resetState();
        this.#currentScale = 0;
        hideResult(this.shadowRoot);
    }
    #updateUI(meta, gatesPassed, gateReasons, rawWidthMm, filteredWidthMm) {
        const els = this.#els;
        const banner = getStateBanner(this.#stateCtx.state, meta.anchorType);
        els.stateBanner.textContent = banner.text;
        els.stateBanner.style.background = banner.color;
        const isSweeping = this.#stateCtx.state === 'SWEEPING';
        els.progressContainer.style.display = isSweeping ? 'block' : 'none';
        els.progressLabel.style.display = isSweeping ? 'block' : 'none';
        if (isSweeping) {
            const progress = Math.min(100, (this.#stateCtx.gatedWidths.length / this.#config.minGatedFrames) * 100);
            els.progressBar.style.width = `${progress}%`;
            els.progressLabel.textContent = `${this.#stateCtx.gatedWidths.length} / ${this.#config.minGatedFrames} gated frames`;
        }
        // θ coverage: live during SWEEPING, frozen at the final value once computed.
        const isTerminal = this.#stateCtx.state === 'RESULT' || this.#stateCtx.state === 'RETRY';
        const liveThetaCoverageDeg = this.#stateCtx.observations.length >= 2
            ? thetaCoverage(this.#stateCtx.observations.map((o) => o.thetaRad))
            : 0;
        const hudData = {
            state: this.#stateCtx.state,
            coinDetected: meta.coinInFrame || meta.coinConfidence > 0,
            coinConfidence: meta.coinConfidence,
            coinInFrame: meta.coinInFrame,
            scalePxMm: this.#currentScale,
            handDetected: meta.landmarkConfidence > 0,
            landmarkConfidence: meta.landmarkConfidence,
            rawWidthMm,
            filteredWidthMm,
            blurScore: meta.blurScore,
            fingerTiltZ: meta.fingerTiltZ,
            gatesPassed,
            gateReasons,
            gatedFrameCount: this.#stateCtx.gatedWidths.length,
            targetFrames: this.#config.minGatedFrames,
            fps: this.#fps,
            anchorType: meta.anchorType,
            thetaCoverageDeg: isTerminal ? this.#stateCtx.thetaCoverageDeg : liveThetaCoverageDeg,
            aggregationMethod: isTerminal ? this.#stateCtx.aggMethod : null,
            minThetaCoverageDeg: this.#config.minThetaCoverageDeg,
        };
        renderHud(hudData, this.shadowRoot);
    }
    #telemetryContext() {
        return {
            apiKey: this.#apiKey,
            sessionId: this.#sessionId,
            locale: this.#locale,
            sizeChartId: this.#sizeChartId,
        };
    }
    #emit(type, detail) {
        this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    }
    #emitRetry(reason, confidenceInterval) {
        this.#emit('retry', buildEventDetail(this.#telemetryContext(), { reason, confidenceInterval }));
    }
    #emitError(message, stage, cause) {
        this.#emit('error', buildEventDetail(this.#telemetryContext(), { message, stage, cause }));
    }
}
//# sourceMappingURL=RingSizerElement.js.map