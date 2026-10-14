import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const KEY = 'isOn'

// Read by the model only: English, not translated.
const SECTION = {
  id: 'concise-mode:style',
  text: [
    '# Concise mode',
    'Answer in the smallest text that solves it: no introduction, no recap, no conclusion.',
    'Code: only the changed snippet. Questions: short bullets. Errors: the direct fix.',
  ].join('\n'),
  scope: 'session',
} as const

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const t = await strings($)

    await $.command.register({ name: 'concise', description: t.description, argumentHint: t.hint })

    if ((await $.store.get(KEY)) === true) {
      $.ui.status(t.status)
    }

    return next(e)
  })

  on('command.run', { command: 'concise' }, async ($, e) => {
    const t = await strings($)
    const wanted = e.args.trim().toLowerCase()
    const isOn = wanted === 'on' ? true : wanted === 'off' ? false : (await $.store.get(KEY)) !== true

    await $.store.set(KEY, isOn)
    $.ui.status(isOn ? t.status : undefined)

    return { text: t.changed(isOn) }
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)

    return (await $.store.get(KEY)) === true
      ? { sections: [...composed.sections, SECTION] }
      : composed
  })
}
