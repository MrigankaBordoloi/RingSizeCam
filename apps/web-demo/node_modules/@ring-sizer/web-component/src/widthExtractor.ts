// ──────────────────────────────────────────────────────────────
// widthExtractor.ts — Finger width measurement via edge detection.
// Extracts ROI around ring-finger proximal segment, finds edges
// perpendicular to the finger axis, measures width in pixels.
// ──────────────────────────────────────────────────────────────

import { pxToMm } from '@ring-sizer/core';
import { RING_FINGER } from './handTracker.js';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

declare const cv: any; // OpenCV.js global

export interface WidthMeasurement {
  widthPx: number;
  widthMm: number;
  roiCenter: { x: number; y: number };
  blurScore: number;  // variance of Laplacian on ROI
}

/**
 * Extract the finger width at the proximal segment of the ring finger.
 *
 * Algorithm:
 * 1. Locate landmarks 13 (MCP) and 14 (PIP) of the ring finger.
 * 2. Compute the midpoint and the perpendicular direction.
 * 3. Extract a ROI strip perpendicular to the finger axis.
 * 4. Apply Canny edge detection on the strip.
 * 5. Find the two strongest edge responses → width in px.
 */
export function extractFingerWidth(
  landmarks: NormalizedLandmark[],
  video: HTMLVideoElement,
  scratchCanvas: HTMLCanvasElement,
  scale: number,
): WidthMeasurement | null {
  if (typeof cv === 'undefined' || typeof cv.Mat === 'undefined') return null;

  const mcp = landmarks[RING_FINGER.MCP];
  const pip = landmarks[RING_FINGER.PIP];
  if (!mcp || !pip) return null;

  const vw = video.videoWidth;
  const vh = video.videoHeight;

  // Landmark pixel coords
  const mcpPx = { x: mcp.x * vw, y: mcp.y * vh };
  const pipPx = { x: pip.x * vw, y: pip.y * vh };

  // Midpoint of proximal segment
  const midX = (mcpPx.x + pipPx.x) / 2;
  const midY = (mcpPx.y + pipPx.y) / 2;

  // Finger axis direction
  const dx = pipPx.x - mcpPx.x;
  const dy = pipPx.y - mcpPx.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 5) return null; // landmarks too close, bad detection

  // Perpendicular direction (normalized)
  const perpX = -dy / len;
  const perpY = dx / len;

  // ROI: a strip perpendicular to finger axis at the midpoint
  // Width of strip along finger axis: ~20px, length along perp: proportional to finger
  const stripHalfLength = len * 0.8; // generous to capture both edges
  const stripHalfWidth = len * 0.15;

  // Define the ROI rectangle in image space
  const roiX = Math.max(0, Math.round(midX - stripHalfLength * Math.abs(perpX) - stripHalfWidth * Math.abs(dx / len)));
  const roiY = Math.max(0, Math.round(midY - stripHalfLength * Math.abs(perpY) - stripHalfWidth * Math.abs(dy / len)));
  const roiW = Math.min(Math.round(stripHalfLength * 2), vw - roiX);
  const roiH = Math.min(Math.round(stripHalfLength * 2), vh - roiY);

  if (roiW < 10 || roiH < 10) return null;

  // Grab frame
  const ctx = scratchCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  scratchCanvas.width = vw;
  scratchCanvas.height = vh;
  ctx.drawImage(video, 0, 0);

  let src: any = null;
  let roi: any = null;
  let gray: any = null;
  let laplacian: any = null;
  let edges: any = null;

  try {
    src = cv.imread(scratchCanvas);
    roi = src.roi(new cv.Rect(roiX, roiY, roiW, roiH));

    gray = new cv.Mat();
    cv.cvtColor(roi, gray, cv.COLOR_RGBA2GRAY);

    // Compute blur score (variance of Laplacian) on the ROI
    laplacian = new cv.Mat();
    cv.Laplacian(gray, laplacian, cv.CV_64F);
    const mean = new cv.Mat();
    const stddev = new cv.Mat();
    cv.meanStdDev(laplacian, mean, stddev);
    const variance = stddev.data64F[0]! * stddev.data64F[0]!;
    mean.delete();
    stddev.delete();

    // Edge detection for width measurement
    edges = new cv.Mat();
    cv.Canny(gray, edges, 50, 150);

    // Sample a line perpendicular to the finger axis through the midpoint
    // in ROI coordinates
    const roiMidX = midX - roiX;
    const roiMidY = midY - roiY;

    // Collect edge points along the perpendicular line
    const edgePoints: number[] = [];
    const numSamples = Math.round(stripHalfLength * 2);

    for (let i = -numSamples; i <= numSamples; i++) {
      const sampleX = Math.round(roiMidX + perpX * i);
      const sampleY = Math.round(roiMidY + perpY * i);

      if (sampleX >= 0 && sampleX < roiW && sampleY >= 0 && sampleY < roiH) {
        const pixel = edges.ucharAt(sampleY, sampleX);
        if (pixel > 0) {
          edgePoints.push(i);
        }
      }
    }

    if (edgePoints.length < 2) return null;

    // Find the two clusters of edge points (left and right side of finger)
    // Simple approach: find the widest gap and split there
    edgePoints.sort((a, b) => a - b);

    let bestGap = 0;
    let gapIndex = 0;
    for (let i = 0; i < edgePoints.length - 1; i++) {
      const gap = edgePoints[i + 1]! - edgePoints[i]!;
      if (gap > bestGap) {
        bestGap = gap;
        gapIndex = i;
      }
    }

    // Width = distance between the inner edges of the two clusters
    const leftEdge = edgePoints[gapIndex]!;
    const rightEdge = edgePoints[gapIndex + 1]!;
    const widthPx = Math.abs(rightEdge - leftEdge);

    if (widthPx < 3) return null; // too narrow, likely noise

    return {
      widthPx,
      widthMm: pxToMm(widthPx, scale),
      roiCenter: { x: midX, y: midY },
      blurScore: variance,
    };
  } catch {
    return null;
  } finally {
    src?.delete();
    roi?.delete();
    gray?.delete();
    laplacian?.delete();
    edges?.delete();
  }
}

/**
 * Compute the finger tilt heuristic: absolute z-delta between
 * landmarks 13 (MCP) and 14 (PIP).
 */
export function computeFingerTilt(landmarks: NormalizedLandmark[]): number {
  const mcp = landmarks[RING_FINGER.MCP];
  const pip = landmarks[RING_FINGER.PIP];
  if (!mcp || !pip) return Infinity;
  return Math.abs((mcp.z ?? 0) - (pip.z ?? 0));
}
