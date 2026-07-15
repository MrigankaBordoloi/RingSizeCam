// ──────────────────────────────────────────────────────────────
// main.ts — Thin demo page: mounts <ring-sizer> and logs its
// result/retry/error events. All pipeline logic lives in
// @ring-sizer/web-component; this file proves the embed contract.
// ──────────────────────────────────────────────────────────────

import '@ring-sizer/web-component';
import type {
  ResultEventDetail,
  RetryEventDetail,
  ErrorEventDetail,
} from '@ring-sizer/web-component';

const ringSizer = document.querySelector('ring-sizer')!;
const eventLog = document.getElementById('event-log')!;
const toggleBtn = document.getElementById('toggle-mount-btn')!;

function log(type: string, detail: unknown): void {
  const line = `[${new Date().toLocaleTimeString()}] ${type}: ${JSON.stringify(detail)}\n`;
  eventLog.textContent = line + eventLog.textContent;
}

ringSizer.addEventListener('result', (e) => log('result', (e as CustomEvent<ResultEventDetail>).detail));
ringSizer.addEventListener('retry', (e) => log('retry', (e as CustomEvent<RetryEventDetail>).detail));
ringSizer.addEventListener('error', (e) => log('error', (e as CustomEvent<ErrorEventDetail>).detail));

// Toggle mount/unmount to prove disconnectedCallback tears the pipeline
// down cleanly (camera light off, frame loop stopped).
const parent = ringSizer.parentElement!;
const nextSibling = ringSizer.nextSibling;
let mounted = true;

toggleBtn.addEventListener('click', () => {
  if (mounted) {
    ringSizer.remove();
    toggleBtn.textContent = 'Mount ring-sizer';
  } else {
    parent.insertBefore(ringSizer, nextSibling);
    toggleBtn.textContent = 'Unmount ring-sizer';
  }
  mounted = !mounted;
});
