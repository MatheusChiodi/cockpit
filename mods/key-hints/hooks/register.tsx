import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

export const register: Register = on => {
  // The engine's hint stays as it is, with its live pills; the keys that matter now go after it.
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const s = await strings($)
    const tail = e.props.isWorking ? s.working : e.props.isDraft ? s.draft : s.idle

    return next({ ...e, props: { ...e.props, tail: e.props.tail === undefined ? tail : `${e.props.tail}  ${tail}` } })
  })
}
