import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// The typed text, else the mouse selection, else ''.
const input = async ($: EngineInterface, args: string): Promise<string> => {
  if (args.trim() !== '') {
    return args.trim()
  }

  try {
    return ((await $.ui.selection())?.text ?? '').trim()
  } catch {
    return ''
  }
}

type Mode = 'encode' | 'decode'

// The mode word at the start of the arguments, and the text after it.
const split = (text: string): { mode?: Mode; rest: string } => {
  const match = /^(encode|enc|decode|dec)(?:\s+([\s\S]*))?$/i.exec(text)

  if (match === null) {
    return { rest: text }
  }

  return { mode: (match[1] ?? '').toLowerCase().startsWith('enc') ? 'encode' : 'decode', rest: (match[2] ?? '').trim() }
}

// The converted text, or one line saying why it cannot be decoded.
const convert = (mode: Mode, text: string, s: (typeof STRINGS)['en']): { out?: string; error?: string } => {
  if (mode === 'encode') {
    return { out: encodeURIComponent(text) }
  }

  const bad = /%(?![0-9a-fA-F]{2})/.exec(text)

  if (bad !== null) {
    return { error: s.badPercent(bad.index + 1) }
  }

  try {
    return { out: decodeURIComponent(text) }
  } catch {
    const at = text.search(/%[89a-fA-F][0-9a-fA-F]/)

    return { error: s.badBytes(at + 1) }
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'url', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'url' }, async ($, e) => {
    const s = await strings($)
    const { mode, rest } = split(e.args.trim())
    const text = rest === '' ? await input($, '') : rest

    if (text === '') {
      return { text: s.usage }
    }

    const chosen: Mode = mode ?? (/%[0-9a-fA-F]{2}/.test(text) ? 'decode' : 'encode')
    const result = convert(chosen, text, s)

    if (result.out === undefined) {
      return { text: result.error }
    }

    await $.ui.copy({ text: result.out })

    return { text: `${result.out}\n${chosen === 'encode' ? s.encoded : s.decoded} ${s.copied}` }
  })
}
