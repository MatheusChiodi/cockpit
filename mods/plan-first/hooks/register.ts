import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

const KEY = 'isOn'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const SECTION = {
  id: 'plan-first:rule',
  text: [
    '# Plan first',
    'When a change spans more than two files, list the files you will touch and the order before editing.',
    'Then follow that list.',
  ].join('\n'),
  scope: 'session',
} as const

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'plan-first', description: s.command, argumentHint: s.hint })

    if ((await $.store.get(KEY)) === true) {
      $.ui.status(s.status)
    }

    return next(e)
  })

  on('command.run', { command: 'plan-first' }, async ($, e) => {
    const s = await strings($)
    const wanted = e.args.trim().toLowerCase()
    const isOn = wanted === 'on' ? true : wanted === 'off' ? false : (await $.store.get(KEY)) !== true

    await $.store.set(KEY, isOn)
    $.ui.status(isOn ? s.status : undefined)

    return { text: s.switched(isOn) }
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)

    return (await $.store.get(KEY)) === true ? { sections: [...composed.sections, SECTION] } : composed
  })
}
