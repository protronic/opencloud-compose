/** @type {Record<string, PromiseWithState<SVGSVGElement>>} */
export declare const cache: Record<string, PromiseWithState<SVGSVGElement>>;
export interface PromiseWithState<T> extends Promise<T> {
    getIsPending: () => boolean;
}
/**
 * This function allow you to modify a JS Promise by adding some status properties.
 * @template {any} T
 * @param {Promise<T>|PromiseWithState<T>} promise
 * @return {PromiseWithState<T>}
 */
export declare function makePromiseState<T>(promise: Promise<T> | PromiseWithState<T>): PromiseWithState<T>;
//# sourceMappingURL=cache.d.ts.map