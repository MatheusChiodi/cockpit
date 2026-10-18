import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// The engine words it `(ctrl+b to run in background)`, with the person's own binding.
const PILL = /^\((.+) to run in background\)$/

export const register: Register = on => {
  on('ui.render', { component: 'ToolProgress' }, async ($, e, next) => {
    const key = PILL.exec(e.props.hint)?.[1]

    if (key === undefined) {
      return next(e)
    }

    const s = await strings($)

    return next({ ...e, props: { ...e.props, hint: `(${key} ${s.background})` } })
  })
}
