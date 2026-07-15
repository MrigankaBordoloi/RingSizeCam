export declare class RingSizerElement extends HTMLElement {
    #private;
    static get observedAttributes(): string[];
    constructor();
    get apiKey(): string | null;
    get locale(): string;
    get sizeChartId(): string;
    attributeChangedCallback(name: string, _old: string | null, val: string | null): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
}
//# sourceMappingURL=RingSizerElement.d.ts.map