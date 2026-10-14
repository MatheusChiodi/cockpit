import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// The typed text, else the mouse selection, else ''.
const input = async ($: EngineInterface, args: string): Promise<string> => {
  if (args.trim() !== '') {
    return args
  }

  try {
    return (await $.ui.selection())?.text ?? ''
  } catch {
    return ''
  }
}

const digest = async (algorithm: string, text: string): Promise<string> => {
  const buffer = await crypto.subtle.digest(algorithm, new TextEncoder().encode(text))

  return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'hash', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'hash' }, async ($, e) => {
    const s = await strings($)
    const text = await input($, e.args)

    if (text.trim() === '') {
      return { text: s.usage }
    }

    const sha256 = await digest('SHA-256', text)
    const sha1 = await digest('SHA-1', text)
    await $.ui.copy({ text: sha256 })

    return { text: `sha-256  ${sha256}\nsha-1    ${sha1}\n${s.copied}` }
  })
}
