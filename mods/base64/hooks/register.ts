import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// The text after the mode, else the mouse selection, else ''.
const input = async ($: EngineInterface, rest: string): Promise<string> => {
  if (rest.trim() !== '') {
    return rest
  }

  try {
    return (await $.ui.selection())?.text ?? ''
  } catch {
    return ''
  }
}

const encode = (text: string): string => {
  const bytes = new TextEncoder().encode(text)
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

// The decoded text; undefined for text that is not Base64, null for bytes that are not UTF-8.
const decode = (text: string): string | null | undefined => {
  const clean = text.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '')

  if (!/^[A-Za-z0-9+/]*$/.test(clean) || clean.length % 4 === 1) {
    return undefined
  }

  const binary = atob(clean.padEnd(clean.length + ((4 - (clean.length % 4)) % 4), '='))
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
  const decoded = new TextDecoder('utf-8').decode(bytes)

  return decoded.includes('�') ? null : decoded
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'b64', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'b64' }, async ($, e) => {
    const s = await strings($)
    const match = /^\s*(enc|encode|dec|decode)(?:\s+([\s\S]*))?$/i.exec(e.args)
    const text = match === null ? '' : await input($, match[2] ?? '')

    if (match === null || text.trim() === '') {
      return { text: s.usage }
    }

    const isEncode = (match[1] ?? '').toLowerCase().startsWith('enc')
    const result = isEncode ? encode(text) : decode(text)

    if (result === undefined || result === null) {
      return { text: result === null ? s.invalidText : s.invalidBase64 }
    }

    await $.ui.copy({ text: result })

    return { text: `${result}\n${s.copied}` }
  })
}
