// ──────────────────────────────────────────────────────────────
// debugHud.ts — Toggleable debug heads-up display.
// Shows: coin detection, landmarks, scale, gates, widths, filter.
// First-class deliverable — not a nice-to-have.
// ──────────────────────────────────────────────────────────────

export interface HudData {
  // State
  state: string;

  // Coin
  coinDetected: boolean;
  coinConfidence: number;
  coinInFrame: boolean;
  scalePxMm: number;

  // Hand
  handDetected: boolean;
  landmarkConfidence: number;

  // Width
  rawWidthMm: number;
  filteredWidthMm: number;

  // Gates
  blurScore: number;
  fingerTiltZ: number;
  gatesPassed: boolean;
  gateReasons: string[];

  // Aggregation
  gatedFrameCount: number;
  targetFrames: number;

  // Anchor + rotation coverage
  anchorType: 'coin' | 'card';
  thetaCoverageDeg: number;
  aggregationMethod: 'least-squares' | 'percentile' | null;
  minThetaCoverageDeg: number;

  // FPS
  fps: number;
}

let hudVisible = false;

/** Toggle HUD visibility. Returns new state. */
export function toggleHud(): boolean {
  hudVisible = !hudVisible;
  const el = document.getElementById('debug-hud');
  if (el) {
    el.classList.toggle('visible', hudVisible);
  }
  return hudVisible;
}

/** Check if HUD is currently visible. */
export function isHudVisible(): boolean {
  return hudVisible;
}

/** Initialize keyboard shortcut (D key). */
export function initHudToggle(): void {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'd' || e.key === 'D') {
      toggleHud();
    }
  });
}

function gateIcon(passed: boolean): string {
  return passed ? '✅' : '❌';
}

/** Render HUD data into the #debug-hud element. */
export function renderHud(data: HudData): void {
  const el = document.getElementById('debug-hud');
  if (!el || !hudVisible) return;

  const blurPassed = data.blurScore >= 100; // uses config threshold
  const confPassed = data.landmarkConfidence >= 0.7;
  const coinPassed = data.coinInFrame && data.coinConfidence >= 0.5;
  const tiltPassed = data.fingerTiltZ <= 0.12;

  el.innerHTML = `
    <div class="hud-section">Pipeline</div>
    <div class="hud-row">
      <span class="hud-label">State</span>
      <span class="hud-val">${data.state}</span>
    </div>
    <div class="hud-row">
      <span class="hud-label">FPS</span>
      <span class="hud-val">${data.fps.toFixed(0)}</span>
    </div>

    <div class="hud-section">Scale</div>
    <div class="hud-row">
      <span class="hud-label">${data.anchorType === 'card' ? 'Card' : 'Coin'}</span>
      <span class="${data.coinDetected ? 'hud-pass' : 'hud-fail'}">${data.coinDetected ? 'Detected' : 'None'}</span>
    </div>
    <div class="hud-row">
      <span class="hud-label">${data.anchorType === 'card' ? 'Card' : 'Coin'} conf</span>
      <span class="hud-val">${data.coinConfidence.toFixed(3)}</span>
    </div>
    <div class="hud-row">
      <span class="hud-label">Scale</span>
      <span class="hud-val">${data.scalePxMm > 0 ? data.scalePxMm.toFixed(2) + ' px/mm' : '—'}</span>
    </div>

    <div class="hud-section">Hand</div>
    <div class="hud-row">
      <span class="hud-label">Hand</span>
      <span class="${data.handDetected ? 'hud-pass' : 'hud-fail'}">${data.handDetected ? 'Detected' : 'None'}</span>
    </div>
    <div class="hud-row">
      <span class="hud-label">LM conf</span>
      <span class="hud-val">${data.landmarkConfidence.toFixed(3)}</span>
    </div>

    <div class="hud-section">Measurement</div>
    <div class="hud-row">
      <span class="hud-label">Raw width</span>
      <span class="hud-val">${data.rawWidthMm > 0 ? data.rawWidthMm.toFixed(2) + ' mm' : '—'}</span>
    </div>
    <div class="hud-row">
      <span class="hud-label">Filtered</span>
      <span class="hud-val">${data.filteredWidthMm > 0 ? data.filteredWidthMm.toFixed(2) + ' mm' : '—'}</span>
    </div>

    <div class="hud-section">Gates</div>
    <div class="hud-row">
      <span class="hud-label">${gateIcon(confPassed)} LM conf</span>
      <span class="${confPassed ? 'hud-pass' : 'hud-fail'}">${data.landmarkConfidence.toFixed(3)}</span>
    </div>
    <div class="hud-row">
      <span class="hud-label">${gateIcon(blurPassed)} Blur</span>
      <span class="${blurPassed ? 'hud-pass' : 'hud-fail'}">${data.blurScore.toFixed(0)}</span>
    </div>
    <div class="hud-row">
      <span class="hud-label">${gateIcon(coinPassed)} ${data.anchorType === 'card' ? 'Card' : 'Coin'}</span>
      <span class="${coinPassed ? 'hud-pass' : 'hud-fail'}">${data.coinInFrame ? 'In frame' : 'Missing'}</span>
    </div>
    <div class="hud-row">
      <span class="hud-label">${gateIcon(tiltPassed)} Tilt z</span>
      <span class="${tiltPassed ? 'hud-pass' : 'hud-fail'}">${data.fingerTiltZ.toFixed(4)}</span>
    </div>

    <div class="hud-section">Sweep</div>
    <div class="hud-row">
      <span class="hud-label">Gated</span>
      <span class="hud-val">${data.gatedFrameCount} / ${data.targetFrames}</span>
    </div>
    <div class="hud-row">
      <span class="hud-label">θ coverage</span>
      <span class="${data.thetaCoverageDeg >= data.minThetaCoverageDeg ? 'hud-pass' : 'hud-val'}">${data.thetaCoverageDeg.toFixed(0)}° / ${data.minThetaCoverageDeg}°</span>
    </div>
    <div class="hud-row">
      <span class="hud-label">Fit method</span>
      <span class="hud-val">${data.aggregationMethod ?? '—'}</span>
    </div>
  `;
}
