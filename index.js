"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var m = require("mithril");
var NONE = 0;
var MOUSE = 1;
var TOUCH = 2;
// So we aren't triggered by echoed mouse events (some mobile browsers)
var DEVICE_DELAY = 350;
/** Clamp number to range */
function clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
}
/** Given an input value, quantize it to the step size */
function quantize(val, min, max, step) {
    if (max - min <= 0)
        return min;
    if (step <= 0)
        return clamp(val, min, max);
    var steps = Math.ceil((max - min) / step);
    var v = min + Math.round(steps * (val - min) / (max - min)) * step;
    return clamp(v, min, max);
}
exports.quantize = quantize;
/** Slider Component */
var mithrilSlider = function mithrilSlider() {
    var elHit;
    var elBar;
    var elHandle;
    var rcBar;
    var device = NONE;
    var pressed = false;
    // Attrs we need to cache
    var min = 0;
    var max = 10;
    var value = 0;
    var startValue = 0;
    var step = 1;
    var onchange;
    var ondrag;
    function onMouseDown(e) {
        if (device === TOUCH)
            return;
        device = MOUSE;
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        onPress(e.clientX, e.clientY);
    }
    function onMouseMove(e) {
        e.preventDefault();
        onMove(e.clientX, e.clientY);
    }
    function onMouseUp(e) {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        onRelease(e.clientX, e.clientY);
    }
    function onTouchStart(e) {
        if (device === MOUSE)
            return;
        window.addEventListener('touchmove', onTouchMove);
        window.addEventListener('touchend', onTouchEnd);
        var t = e.changedTouches[0];
        onPress(t.clientX, t.clientY);
    }
    function onTouchMove(e) {
        e.preventDefault();
        var t = e.changedTouches[0];
        onMove(t.clientX, t.clientY);
    }
    function onTouchEnd(e) {
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        var t = e.changedTouches[0];
        onRelease(t.clientX, t.clientY);
    }
    function onPress(x, y) {
        startValue = value;
        pressed = true;
        var val = moveHandle(x, y);
        if (val !== value) {
            value = val;
            if (ondrag && ondrag(value) !== false) {
                m.redraw();
            }
        }
    }
    function onMove(x, y) {
        if (!pressed)
            return;
        var val = moveHandle(x, y);
        if (val !== value) {
            value = val;
            if (ondrag && ondrag(value) !== false) {
                m.redraw();
            }
        }
    }
    function onRelease(x, y) {
        if (!pressed)
            return;
        pressed = false;
        value = moveHandle(x, y);
        if (value !== startValue) {
            if (onchange && onchange(value) !== false) {
                m.redraw();
            }
        }
        setTimeout(function () {
            if (!pressed)
                device = NONE;
        }, DEVICE_DELAY);
    }
    function onKeyDown(e) {
        var k = e.keyCode;
        if (k < 37 || k > 40)
            return;
        var s = step > 0 ? step : (max - min) / 10;
        var newVal;
        if (k === 37 || k === 38) {
            newVal = Math.max(value - s, min);
        }
        else if (k === 39 || k === 40) {
            newVal = Math.min(value + s, max);
        }
        if (typeof newVal === 'number' && newVal !== value) {
            value = newVal;
            elHandle.style.left = positionStyle(value);
            if (onchange && onchange(value) !== false) {
                m.redraw();
            }
        }
    }
    function moveHandle(x, y) {
        var barWidth = rcBar.right - rcBar.left;
        var hx = clamp(x - rcBar.left, 0, barWidth);
        var val = quantize((hx / barWidth) * (max - min) + min, min, max, step);
        elHandle.style.left = positionStyle(val);
        return val;
    }
    /** Compute handle position style */
    function positionStyle(val) {
        return String(100 * (val - min) / (max - min)) + '%';
    }
    /** Some attrs need to be cached (and updated) so that they are current in event handlers */
    function updateAttrs(attrs) {
        min = attrs.min;
        max = attrs.max;
        step = (typeof attrs.step === 'number' && !Number.isNaN(attrs.step))
            ? clamp(attrs.step, 0, max - min) : 1;
        onchange = attrs.onchange;
        ondrag = attrs.ondrag;
        if (typeof attrs.value === 'number') {
            value = clamp(attrs.value, min, max);
        }
    }
    /** Need to keep bar size up to date */
    function resize() {
        rcBar = elBar.getBoundingClientRect();
    }
    /** Return mithril component hooks object */
    return {
        oncreate: function (_a) {
            var attrs = _a.attrs, dom = _a.dom;
            updateAttrs(attrs);
            elHit = dom;
            elBar = dom.querySelector('.mithril-slider-bar');
            elHandle = dom.querySelector('.mithril-slider-handle');
            elHit.addEventListener('mousedown', onMouseDown);
            elHit.addEventListener('touchstart', onTouchStart);
            elHit.addEventListener('keydown', onKeyDown);
            window.addEventListener('resize', resize);
            resize();
        },
        onremove: function () {
            elHit.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            elHit.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
            elHit.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', resize);
        },
        view: function (_a) {
            var attrs = _a.attrs;
            updateAttrs(attrs);
            value = quantize(value, min, max, step);
            var klass = 'mithril-slider' + (attrs.class != null ? ' ' + attrs.class : '');
            return m('div', {
                class: klass,
                tabIndex: 1,
                id: attrs.id,
                'aria-valuemin': String(min),
                'aria-valuemax': String(max),
                'aria-valuenow': String(value),
                'aria-labelledby': attrs.ariaLabelledby
            }, m('div', { class: 'mithril-slider-bar' }, m('div', {
                class: 'mithril-slider-handle',
                style: {
                    left: positionStyle(value)
                }
            })));
        }
    };
};
exports.default = mithrilSlider;
