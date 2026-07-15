/**
 * Idempotent: safe to call from every <ring-sizer> instance's
 * connectedCallback. No-ops if `cv` is already defined or the script tag
 * (fixed id) has already been injected by another instance.
 */
export declare function injectOpenCvScriptOnce(src?: string): void;
//# sourceMappingURL=opencvLoader.d.ts.map