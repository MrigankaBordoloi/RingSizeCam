// ──────────────────────────────────────────────────────────────
// opencvLoader.ts — Self-injects OpenCV.js so host pages embedding
// <ring-sizer> need zero pipeline-specific markup of their own.
// ──────────────────────────────────────────────────────────────

const OPENCV_SCRIPT_ID = 'ring-sizer-opencv-script';
const DEFAULT_OPENCV_SRC = 'https://docs.opencv.org/4.10.0/opencv.js';

/**
 * Idempotent: safe to call from every <ring-sizer> instance's
 * connectedCallback. No-ops if `cv` is already defined or the script tag
 * (fixed id) has already been injected by another instance.
 */
export function injectOpenCvScriptOnce(src: string = DEFAULT_OPENCV_SRC): void {
  if (typeof document === 'undefined') return;
  if (typeof (globalThis as { cv?: unknown }).cv !== 'undefined') return;
  if (document.getElementById(OPENCV_SCRIPT_ID)) return;

  const script = document.createElement('script');
  script.id = OPENCV_SCRIPT_ID;
  script.src = src;
  script.async = true;
  document.head.appendChild(script);
}
