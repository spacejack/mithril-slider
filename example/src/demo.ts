import * as m from 'mithril'
import * as stream from 'mithril/stream'
import slider from '../../src'
// Slider exposes a quantize function so we can easily
// sync our app values with possible slider values.
import {quantize} from '../../src'

const value = stream(0)
const min = stream(0)
const max = stream(100)
const step = stream(1)

/** Demo component */
export default {
	view() {
		return m('.demo',
			m(slider, {
				class: 'app-slider',
				min: min(),
				max: max(),
				step: step(),
				value: value(),
				id: 'example-slider',
				onchange: value,
				ondrag: (val: number) => {
					value(val)
					// Could prevent redraw here by returning false
					// return false
				}
			}),
			m('.config',
				m('p',
					m('label', "Value: "),
					m('input', {
						type: 'text',
						value: value().toString(),
						onblur: m.withAttr('value', (val: string) => {
							const v = Number(val)
							if (!Number.isNaN(v)) {
								value(quantize(v, min(), max(), step()))
							}
						})
					})
				),
				m('p',
					m('label', "Min: "),
					m('input', {
						type: 'text',
						value: min().toString(),
						onblur: m.withAttr('value', (val: string) => {
							const v = Number(val)
							if (!Number.isNaN(v)) {
								min(v)
								if (max() < min()) max(min())
								value(quantize(value(), min(), max(), step()))
							}
						})
					})
				),
				m('p',
					m('label', "Max: "),
					m('input', {
						type: 'text',
						value: max().toString(),
						onblur: m.withAttr('value', (val: string) => {
							const v = Number(val)
							if (!Number.isNaN(v)) {
								max(v)
								if (min() > max()) min(max())
								value(quantize(value(), min(), max(), step()))
							}
						})
					})
				),
				m('p',
					m('label', "Step: "),
					m('input', {
						type: 'text',
						value: step().toString(),
						onblur: m.withAttr('value', (val: string) => {
							const v = Number(val)
							if (!Number.isNaN(v)) {
								step(v)
								value(quantize(value(), min(), max(), step()))
							}
						})
					})
				)
			)
		)
	}
} as m.Component<{},{}>
