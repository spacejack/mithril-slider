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

export interface Attrs {
	/** Minimum value */
	min: number
	/** Maximum value */
	max: number
	/** Current value (defaults to min) */
	value?: number
	/** Step size (default 1). 0 means fractions as small as possible. */
	step?: number
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
	let onchange: ((value: number) => false | any) | undefined
	let ondrag: ((value: number) => false | any) | undefined

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
		window.addEventListener('touchmove', onTouchMove)
		window.addEventListener('touchend', onTouchEnd)
		const t = e.changedTouches[0]
		onPress(t.clientX, t.clientY)
	}

	function onTouchMove (e: TouchEvent) {
		e.preventDefault()
		const t = e.changedTouches[0]
		onMove(t.clientX, t.clientY)
	}

	function onTouchEnd (e: TouchEvent) {
		window.removeEventListener('touchmove', onTouchMove)
		window.removeEventListener('touchend', onTouchEnd)
		const t = e.changedTouches[0]
		onRelease(t.clientX, t.clientY)
	}

	function onPress (x: number, y: number) {
		startValue = value
		pressed = true
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

	function onKeyDown (e: KeyboardEvent) {
		const k = e.keyCode
		if (k < 37 || k > 40) return
		const s = step > 0 ? step : (max - min) / 10
		let newVal: number | undefined
		if (k === 37 || k === 38) {
			newVal = Math.max(value - s, min)
		} else if (k === 39 || k === 40) {
			newVal = Math.min(value + s, max)
		}
		if (typeof newVal === 'number' && newVal !== value) {
			value = newVal
			elHandle.style.left = positionStyle(value)
			if (onchange && onchange(value) !== false) {
				m.redraw()
			}
		}
	}

	function moveHandle (x: number, y: number) {
		const barWidth = rcBar.right - rcBar.left
		const hx = clamp(x - rcBar.left, 0, barWidth)
		const val = quantize((hx / barWidth) * (max - min) + min, min, max, step)
		elHandle.style.left = positionStyle(val)
		return val
	}

	/** Compute handle position style */
	function positionStyle (val: number) {
		return String(100 * (val - min) / (max - min)) + '%'
	}

	/** Some attrs need to be cached (and updated) so that they are current in event handlers */
	function updateAttrs (attrs: Attrs) {
		min = attrs.min
		max = attrs.max
		step = (typeof attrs.step === 'number' && !Number.isNaN(attrs.step))
			? clamp(attrs.step, 0, max - min) : 1
		onchange = attrs.onchange
		ondrag = attrs.ondrag
		if (typeof attrs.value === 'number') {
			value = clamp(attrs.value, min, max)
		}
	}

	/** Need to keep bar size up to date */
	function resize() {
		rcBar = elBar.getBoundingClientRect()
	}

	/** Return mithril component hooks object */
	return {
		oncreate ({attrs, dom}) {
			updateAttrs(attrs)
			elHit = dom as HTMLElement
			elBar = dom.querySelector('.mithril-slider-bar') as HTMLElement
			elHandle = dom.querySelector('.mithril-slider-handle') as HTMLElement
			elHit.addEventListener('mousedown', onMouseDown)
			elHit.addEventListener('touchstart', onTouchStart)
			elHit.addEventListener('keydown', onKeyDown)
			window.addEventListener('resize', resize)
			resize()
		},

		onremove() {
			elHit.removeEventListener('mousedown', onMouseDown)
			window.removeEventListener('mousemove', onMouseMove)
			window.removeEventListener('mouseup', onMouseUp)
			elHit.removeEventListener('touchstart', onTouchStart)
			window.removeEventListener('touchmove', onTouchMove)
			window.removeEventListener('touchend', onTouchEnd)
			elHit.removeEventListener('keydown', onKeyDown)
			window.removeEventListener('resize', resize)
		},

		view ({attrs}) {
			updateAttrs(attrs)
			value = quantize(value, min, max, step)
			const a: {[id: string]: any} = {
				class: 'mithril-slider' + (attrs.class != null ? ' ' + attrs.class : ''),
				tabIndex: '1',
				role: 'slider',
				'aria-valuemin': String(min),
				'aria-valuemax': String(max),
				'aria-valuenow': String(value),
				'aria-labelledby': attrs.ariaLabelledby,
			}
			if (attrs.id) a.id = attrs.id
			if (attrs.ariaLabelledby) a.ariaLabelledby = attrs.ariaLabelledby
			if (attrs.disabled) {
				a.style = {pointerEvents: 'none'}
				a['aria-disabled'] = 'true'
			}
			return m('div', a,
				m('div', {class: 'mithril-slider-bar'},
					m('div', {
						class: 'mithril-slider-handle',
						style: {
							left: positionStyle(value)
						}
					})
				)
			)
		}
	}
}

export default mithrilSlider
