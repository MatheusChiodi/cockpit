import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

export const register: Register = on => {
  // A mode shown in the footer says nothing about how to leave it; this adds the key.
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    if (e.props.modes.length === 0) {
      return next(e)
    }

    const s = await strings($)

    return next({ ...e, props: { ...e.props, modes: [...e.props.modes.filter(mode => mode !== s.switch), s.switch] } })
  })
}
