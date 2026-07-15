// ──────────────────────────────────────────────────────────────
// resultScreen.ts — Display the ring-size result or retry message.
// ──────────────────────────────────────────────────────────────

import type { MeasurementResult } from '@ring-sizer/core';

/**
 * Show the result overlay with size, CI, and re-measure button.
 */
export function showResult(result: MeasurementResult, isRetry: boolean): void {
  const overlay = document.getElementById('result-overlay')!;
  const sizeEl = document.getElementById('result-size')!;
  const ciEl = document.getElementById('result-ci')!;
  const retryMsg = document.getElementById('result-retry-msg')!;

  if (isRetry) {
    sizeEl.textContent = '—';
    ciEl.textContent = `Measured range: US ${result.confidenceInterval[0].toFixed(1)} – ${result.confidenceInterval[1].toFixed(1)}`;
    retryMsg.style.display = 'block';
  } else {
    sizeEl.textContent = `US ${result.value.toFixed(1)}`;
    ciEl.textContent = `CI: US ${result.confidenceInterval[0].toFixed(1)} – ${result.confidenceInterval[1].toFixed(1)}`;
    retryMsg.style.display = 'none';
  }

  overlay.classList.add('visible');
}

/**
 * Hide the result overlay.
 */
export function hideResult(): void {
  const overlay = document.getElementById('result-overlay')!;
  overlay.classList.remove('visible');
}

/**
 * Set up the re-measure button click handler.
 */
export function initRemeasureButton(onRemeasure: () => void): void {
  const btn = document.getElementById('remeasure-btn')!;
  btn.addEventListener('click', () => {
    hideResult();
    onRemeasure();
  });
}
