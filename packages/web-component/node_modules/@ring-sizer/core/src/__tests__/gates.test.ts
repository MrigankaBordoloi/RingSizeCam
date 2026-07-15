import { describe, it, expect } from 'vitest';
import { checkGates } from '../gates.js';
import type { FrameMetadata, PipelineConfig } from '../types.js';
import { DEFAULT_CONFIG } from '../config.js';

/** A frame that passes all gates. */
function goodFrame(): FrameMetadata {
  return {
    landmarkConfidence: 0.95,
    blurScore: 500,
    coinInFrame: true,
    coinConfidence: 0.9,
    fingerTiltZ: 0.02,
    anchorType: 'coin',
  };
}

describe('checkGates', () => {
  it('passes a good frame', () => {
    const result = checkGates(goodFrame(), DEFAULT_CONFIG);
    expect(result.passed).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it('fails on low landmark confidence', () => {
    const meta = goodFrame();
    meta.landmarkConfidence = 0.3;
    const result = checkGates(meta, DEFAULT_CONFIG);
    expect(result.passed).toBe(false);
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0]).toMatch(/Landmark confidence/i);
  });

  it('fails on low blur score', () => {
    const meta = goodFrame();
    meta.blurScore = 10;
    const result = checkGates(meta, DEFAULT_CONFIG);
    expect(result.passed).toBe(false);
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0]).toMatch(/blurry/i);
  });

  it('fails when anchor is out of frame (coin)', () => {
    const meta = goodFrame();
    meta.coinInFrame = false;
    const result = checkGates(meta, DEFAULT_CONFIG);
    expect(result.passed).toBe(false);
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0]).toMatch(/Coin not fully/i);
  });

  it('fails when anchor is out of frame (card)', () => {
    const meta = goodFrame();
    meta.anchorType = 'card';
    meta.coinInFrame = false;
    const result = checkGates(meta, DEFAULT_CONFIG);
    expect(result.passed).toBe(false);
    expect(result.reasons[0]).toMatch(/Card not fully/i);
  });

  it('fails on low anchor confidence even when anchor is in frame', () => {
    const meta = goodFrame();
    meta.coinConfidence = 0.1;
    const result = checkGates(meta, DEFAULT_CONFIG);
    expect(result.passed).toBe(false);
    expect(result.reasons[0]).toMatch(/Coin detection confidence/i);
  });

  it('uses correct label for card anchor confidence failure', () => {
    const meta = goodFrame();
    meta.anchorType = 'card';
    meta.coinConfidence = 0.1;
    const result = checkGates(meta, DEFAULT_CONFIG);
    expect(result.reasons[0]).toMatch(/Card detection confidence/i);
  });

  it('fails on excessive finger tilt', () => {
    const meta = goodFrame();
    meta.fingerTiltZ = 0.5;
    const result = checkGates(meta, DEFAULT_CONFIG);
    expect(result.passed).toBe(false);
    expect(result.reasons[0]).toMatch(/tilt/i);
  });

  it('collects all failing reasons when multiple gates fail', () => {
    const meta: FrameMetadata = {
      landmarkConfidence: 0.1,
      blurScore: 5,
      coinInFrame: false,
      coinConfidence: 0.0,
      fingerTiltZ: 1.0,
      anchorType: 'coin',
    };
    const result = checkGates(meta, DEFAULT_CONFIG);
    expect(result.passed).toBe(false);
    // Landmark, blur, coin (not in frame), tilt = 4 failures
    expect(result.reasons).toHaveLength(4);
  });

  it('respects custom config thresholds', () => {
    const meta = goodFrame();
    meta.landmarkConfidence = 0.85;

    // With default config (0.7 threshold), this should pass
    expect(checkGates(meta, DEFAULT_CONFIG).passed).toBe(true);

    // With stricter config (0.9 threshold), this should fail
    const strictConfig: PipelineConfig = {
      ...DEFAULT_CONFIG,
      minLandmarkConfidence: 0.9,
    };
    expect(checkGates(meta, strictConfig).passed).toBe(false);
  });
});
