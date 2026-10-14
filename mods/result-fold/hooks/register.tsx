import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Above LIMIT lines a shell result keeps its first and last EDGE lines.
const LIMIT = 40
const EDGE = 15

export const register: Register = on => {
  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    const output = e.props.output as { stdout?: unknown } | null

    if (e.props.tool !== 'Bash' || e.props.isErrored || typeof output?.stdout !== 'string') {
      return next(e)
    }

    const lines = output.stdout.split('\n')

    if (lines.length <= LIMIT) {
      return next(e)
    }

    const s = await strings($)
    const stdout = [...lines.slice(0, EDGE), s.folded(lines.length - 2 * EDGE), ...lines.slice(-EDGE)].join('\n')

    // Only the drawing changes: the stored result, and what the model reads, stay whole.
    return next({ ...e, props: { ...e.props, output: { ...output, stdout } } })
  })
}
