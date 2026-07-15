// ──────────────────────────────────────────────────────────────
// resultScreen.ts — Display the ring-size result or retry message.
// Purely a renderer of pre-resolved label strings — chart lookup
// (nearestSizeLabel) happens in RingSizerElement, which knows the
// active size-chart-id; this module has no opinion on chart tables.
// ──────────────────────────────────────────────────────────────
/**
 * Show the result overlay with size, CI, and re-measure button.
 * `labels` is null only when no measurement was computed at all
 * (e.g. fewer than 2 gated frames) — otherwise it carries the
 * chart-appropriate display strings even on a forced retry.
 */
export function showResult(isRetry, labels, root) {
    const overlay = root.getElementById('result-overlay');
    const sizeEl = root.getElementById('result-size');
    const ciEl = root.getElementById('result-ci');
    const retryMsg = root.getElementById('result-retry-msg');
    if (isRetry) {
        sizeEl.textContent = '—';
        ciEl.textContent = labels
            ? `Measured range: ${labels.lo} – ${labels.hi}`
            : 'Not enough steady frames captured';
        retryMsg.style.display = 'block';
    }
    else {
        sizeEl.textContent = labels.value;
        ciEl.textContent = `CI: ${labels.lo} – ${labels.hi}`;
        retryMsg.style.display = 'none';
    }
    overlay.classList.add('visible');
}
/**
 * Hide the result overlay.
 */
export function hideResult(root) {
    const overlay = root.getElementById('result-overlay');
    overlay.classList.remove('visible');
}
/**
 * Set up the re-measure button click handler.
 */
export function initRemeasureButton(onRemeasure, root) {
    const btn = root.getElementById('remeasure-btn');
    btn.addEventListener('click', () => {
        hideResult(root);
        onRemeasure();
    });
}
//# sourceMappingURL=resultScreen.js.map