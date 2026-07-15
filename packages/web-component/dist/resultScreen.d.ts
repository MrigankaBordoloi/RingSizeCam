export interface ResultLabels {
    value: string;
    lo: string;
    hi: string;
}
/**
 * Show the result overlay with size, CI, and re-measure button.
 * `labels` is null only when no measurement was computed at all
 * (e.g. fewer than 2 gated frames) — otherwise it carries the
 * chart-appropriate display strings even on a forced retry.
 */
export declare function showResult(isRetry: boolean, labels: ResultLabels | null, root: Document | ShadowRoot): void;
/**
 * Hide the result overlay.
 */
export declare function hideResult(root: Document | ShadowRoot): void;
/**
 * Set up the re-measure button click handler.
 */
export declare function initRemeasureButton(onRemeasure: () => void, root: Document | ShadowRoot): void;
//# sourceMappingURL=resultScreen.d.ts.map