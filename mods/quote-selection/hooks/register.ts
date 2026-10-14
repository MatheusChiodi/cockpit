import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'quote', description: s.command })

    return next(e)
  })

  on('command.run', { command: 'quote' }, async $ => {
    const s = await strings($)
    const selected = await $.ui.selection()

    if (selected === undefined || selected.text.trim() === '') {
      return { text: s.nothing }
    }

    const quoted = selected.text.replace(/^/gm, '> ')
    const { isFilled } = await $.prompt.fill({ text: `${quoted}\n\n`, mode: 'insert' })

    return { text: isFilled ? s.quoted : s.failed }
  })
}
