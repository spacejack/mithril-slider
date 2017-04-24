import * as m from 'mithril'

type Devices = 0 | 1 | 2

const NONE  = 0
const MOUSE = 1
const TOUCH = 2

// So we aren't triggered by echoed mouse events (some mobile browsers)
const DEVICE_DELAY = 350

/** Clamp number to range */
function clamp (n: number, min: number, max: number) {
	return Math.min(Math.max(n, min), max)
}

const isIOS = !!navigator.userAgent.match(/iPhone|iPad|iPod/i)

// This is some unbelievable stone-age nonsense.
// Workaround for webkit bug where event.preventDefault
// within touchmove handler fails to prevent scrolling.
let iOSHackAdded = false
function applyIOSHack() {
	// Only apply this hack if iOS, haven't yet applied it,
	// and only if a component is actually created
	if (!isIOS || iOSHackAdded) return
	window.addEventListener('touchmove', function(){})
	iOSHackAdded = true
}

export interface Attrs {
	/** Minimum value */
	min: number
	/** Maximum value */
	max: number
	/** Current value (defaults to min) */
	value?: number
	/** Step size (default 1). 0 means fractions as small as possible. */
	step?: number
	/** Orientation: horizontal or vertical (default horizontal.) */
	orientation?: 'horizontal' | 'vertical'
	/** Optional CSS class to add to containing element */
	class?: string
	/** Optional disabled flag (default false) */
	disabled?: boolean
	/** Optional id attribute */
	id?: string
	/** Optional value for aria-labelledby attribute */
	ariaLabelledby?: string
	/** Callback triggered when value changed */
	onchange? (value: number): false | any
	/** Callback triggered while dragging */
	ondrag? (value: number): false | any
}

/** Given an input value, quantize it to the step size */
export function quantize (val: number, min: number, max: number, step: number) {
	if (max - min <= 0) return min
	if (step <= 0) return clamp(val, min, max)
	const steps = Math.ceil((max - min) / step)
	const v = min + Math.round(steps * (val - min) / (max - min)) * step
	return clamp(v, min, max)
}

/** Slider Component */
const mithrilSlider: m.FactoryComponent<Attrs> = function mithrilSlider() {
	let elHit: HTMLElement
	let elBar: HTMLElement
	let elHandle: HTMLElement
	let rcBar: ClientRect
	let device: Devices = NONE
	let pressed = false
	// Attrs we need to cache
	let min = 0
	let max = 10
	let value = 0
	let startValue = 0
	let step = 1
	let orientation: 'horizontal' | 'vertical' = 'horizontal'
	let onchange: ((value: number) => false | any) | undefined
	let ondrag: ((value: number) => false | any) | undefined

	// Event handlers

	function onMouseDown (e: MouseEvent) {
		if (device === TOUCH) return
		device = MOUSE
		window.addEventListener('mousemove', onMouseMove)
		window.addEventListener('mouseup', onMouseUp)
		onPress(e.clientX, e.clientY)
	}

	function onMouseMove (e: MouseEvent) {
		e.preventDefault()
		onMove(e.clientX, e.clientY)
	}

	function onMouseUp (e: MouseEvent) {
		window.removeEventListener('mousemove', onMouseMove)
		window.removeEventListener('mouseup', onMouseUp)
		onRelease(e.clientX, e.clientY)
	}

	function onTouchStart (e: TouchEvent) {
		if (device === MOUSE) return
		elHit.addEventListener('touchmove', onTouchMove)
		elHit.addEventListener('touchend', onTouchEnd)
		const t = e.changedTouches[0]
		onPress(t.clientX, t.clientY)
	}

	function onTouchMove (e: TouchEvent) {
		e.preventDefault()
		const t = e.changedTouches[0]
		onMove(t.clientX, t.clientY)
	}

	function onTouchEnd (e: TouchEvent) {
		elHit.removeEventListener('touchmove', onTouchMove)
		elHit.removeEventListener('touchend', onTouchEnd)
		const t = e.changedTouches[0]
		onRelease(t.clientX, t.clientY)
	}

	function onKeyDown (e: KeyboardEvent) {
		const k = e.keyCode
		let newVal: number | undefined
		if (k === 33) { // pgup
			e.preventDefault()
			let s = Math.max((max - min) / 10, step)
			if (s <= 0) s = 1
			newVal = quantize(value + s, min, max, step)
		} else if (k === 34) { // pgdown
			e.preventDefault()
			let s = Math.max((max - min) / 10, step)
			if (s <= 0) s = 1
			newVal = quantize(value - s, min, max, step)
		} else if (k === 35) { // end
			e.preventDefault()
			newVal = max
		} else if (k === 36) { // home
			e.preventDefault()
			newVal = min
		} else if (k === 37 || k === 40) { // left/down
			e.preventDefault()
			const s = step > 0 ? step : (max - min) / 10
			newVal = Math.max(value - s, min)
		} else if (k === 38 || k === 39) { // right/up
			e.preventDefault()
			const s = step > 0 ? step : (max - min) / 10
			newVal = Math.min(value + s, max)
		}
		if (typeof newVal !== 'number' || newVal === value) {
			return // no change to make
		}
		value = newVal
		elHandle.style[orientation === 'vertical' ? 'top' : 'left'] = positionStyle(value)
		if (onchange && onchange(value) !== false) {
			m.redraw()
		}
	}

	// App handlers

	function onPress (x: number, y: number) {
		startValue = value
		pressed = true
		rcBar = elBar.getBoundingClientRect()
		const val = moveHandle(x, y)
		if (val !== value) {
			value = val
			if (ondrag && ondrag(value) !== false) {
				m.redraw()
			}
		}
	}

	function onMove (x: number, y: number) {
		if (!pressed) return
		const val = moveHandle(x, y)
		if (val !== value) {
			value = val
			if (ondrag && ondrag(value) !== false) {
				m.redraw()
			}
		}
	}

	function onRelease (x: number, y: number) {
		if (!pressed) return
		pressed = false
		value = moveHandle(x, y)
		if (value !== startValue) {
			if (onchange && onchange(value) !== false) {
				m.redraw()
			}
		}
		setTimeout(() => {
			if (!pressed) device = NONE
		}, DEVICE_DELAY)
	}

	function moveHandle (x: number, y: number) {
		let barLength: number, delta: number, s: string
		if (orientation === 'vertical') {
			barLength = rcBar.bottom - rcBar.top
			delta = rcBar.bottom - y
			s = 'top'
		} else {
			barLength = rcBar.right - rcBar.left
			delta = x - rcBar.left
			s = 'left'
		}
		delta = clamp(delta, 0, barLength)
		const val = quantize((delta / barLength) * (max - min) + min, min, max, step)
		elHandle.style[s] = positionStyle(val)
		return val
	}

	/** Compute handle position style */
	function positionStyle (val: number) {
		let s = (val - min) / (max - min)
		if (orientation === 'vertical') s = 1.0 - s
		return String(100 * s) + '%'
	}

	/** Some attrs need to be cached (and updated) so that they are current in event handlers */
	function updateAttrs (attrs: Attrs) {
		min = attrs.min
		max = attrs.max
		step = (typeof attrs.step === 'number' && !Number.isNaN(attrs.step))
			? clamp(attrs.step, 0, max - min) : 1
		orientation = attrs.orientation === 'vertical' ? 'vertical' : 'horizontal'
		onchange = attrs.onchange
		ondrag = attrs.ondrag
		if (typeof attrs.value === 'number') {
			value = clamp(attrs.value, min, max)
		}
	}

	/** Return mithril component hooks object */
	return {
		oncreate ({attrs, dom}) {
			applyIOSHack()
			updateAttrs(attrs)
			elHit = dom as HTMLElement
			elBar = dom.querySelector('.mithril-slider-bar') as HTMLElement
			elHandle = dom.querySelector('.mithril-slider-handle') as HTMLElement
			elHit.addEventListener('mousedown', onMouseDown)
			elHit.addEventListener('touchstart', onTouchStart)
			elHit.addEventListener('keydown', onKeyDown)
		},

		onremove() {
			window.removeEventListener('mousemove', onMouseMove)
			window.removeEventListener('mouseup', onMouseUp)
			elHit.removeEventListener('mousedown', onMouseDown)
			elHit.removeEventListener('touchstart', onTouchStart)
			elHit.removeEventListener('touchmove', onTouchMove)
			elHit.removeEventListener('touchend', onTouchEnd)
			elHit.removeEventListener('keydown', onKeyDown)
		},

		view ({attrs}) {
			updateAttrs(attrs)
			value = quantize(value, min, max, step)
			const a: {[id: string]: any} = {
				class: 'mithril-slider' + (attrs.class != null ? ' ' + attrs.class : ''),
				tabIndex: '0',
				role: 'slider',
				'aria-valuemin': String(min),
				'aria-valuemax': String(max),
				'aria-valuenow': String(value),
				'aria-orientation': orientation
			}
			if (attrs.id) a.id = attrs.id
			if (attrs.ariaLabelledby) a['aria-labelledby'] = attrs.ariaLabelledby
			if (attrs.disabled) {
				a.style = {pointerEvents: 'none'}
				a['aria-disabled'] = 'true'
			}
			const ps = positionStyle(value)
			const bs = orientation === 'vertical'
				? {top: ps} : {left: ps}
			return m('div', a,
				m('div', {class: 'mithril-slider-bar'},
					m('div', {
						class: 'mithril-slider-handle',
						style: bs
					})
				)
			)
		}
	}
}

export default mithrilSlider
