/// <reference types="mithril" />
import * as m from 'mithril';
export interface Attrs {
    /** Minimum value */
    min: number;
    /** Maximum value */
    max: number;
    /** Current value (defaults to min) */
    value?: number;
    /** Step size (default 1). 0 means fractions as small as possible. */
    step?: number;
    /** Optional CSS class to add to containing element */
    class?: string;
    /** Optional id attribute */
    id?: string;
    /** Optional value for aria-labelledby attribute */
    ariaLabelledby?: string;
    /** Callback triggered when value changed */
    onchange?(value: number): false | any;
    /** Callback triggered while dragging */
    ondrag?(value: number): false | any;
}
/** Given an input value, quantize it to the step size */
export declare function quantize(val: number, min: number, max: number, step: number): number;
/** Slider Component */
declare const mithrilSlider: m.FactoryComponent<Attrs>;
export default mithrilSlider;
