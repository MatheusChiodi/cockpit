import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const MAX = 20

// How many UUIDs the argument asks for; undefined when it is not a number from 1 to MAX.
const count = (args: string): number | undefined => {
  const text = args.trim()

  if (text === '') {
    return 1
  }

  const n = Number(text)

  return /^\d+$/.test(text) && n >= 1 && n <= MAX ? n : undefined
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'uuid', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'uuid' }, async ($, e) => {
    const s = await strings($)
    const n = count(e.args)

    if (n === undefined) {
      return { text: s.usage }
    }

    const ids = Array.from({ length: n }, () => crypto.randomUUID())
    const { isCopied } = await $.ui.copy({ text: ids.join('\n') })

    return { text: `${ids.join('\n')}\n${isCopied ? s.copied(n) : s.noClipboard}` }
  })
}
