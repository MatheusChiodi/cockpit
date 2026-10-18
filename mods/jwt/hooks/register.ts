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

const DATES = ['exp', 'nbf', 'iat'] as const

// One base64url segment as JSON, or the reason it failed.
const segment = (part: string): { json?: unknown; why: 'notBase64' | 'notJson' | '' } => {
  if (!/^[A-Za-z0-9_-]*$/.test(part)) {
    return { why: 'notBase64' }
  }

  const base = part.replace(/-/g, '+').replace(/_/g, '/')

  try {
    const binary = atob(base.padEnd(base.length + ((4 - (base.length % 4)) % 4), '='))
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))

    return { json: JSON.parse(new TextDecoder('utf-8').decode(bytes)), why: '' }
  } catch {
    return { why: 'notJson' }
  }
}

const utc = (seconds: number): string => `${new Date(seconds * 1000).toISOString().slice(0, 19).replace('T', ' ')} UTC`

// The decoded token as text, or one line saying what is wrong.
const decode = (token: string, now: number, s: (typeof STRINGS)['en']): string => {
  const parts = token.replace(/\s+/g, '').split('.')

  if (parts.length !== 3) {
    return s.notJwt(parts.length)
  }

  const names = [s.header, s.payload] as const
  const decoded: unknown[] = []

  for (const [index, name] of names.entries()) {
    const part = segment(parts[index] ?? '')

    if (part.why !== '') {
      return s.badPart(name, s[part.why])
    }

    decoded.push(part.json)
  }

  const lines = [`${s.header}  ${JSON.stringify(decoded[0])}`, `${s.payload} ${JSON.stringify(decoded[1])}`]
  const claims = (decoded[1] ?? {}) as Record<string, unknown>

  for (const key of DATES) {
    const value = claims[key]

    if (typeof value !== 'number') {
      continue
    }

    const state =
      key === 'exp' ? (value * 1000 < now ? s.expired : s.valid) : key === 'nbf' && value * 1000 > now ? s.notYet : ''
    lines.push(`${key.padEnd(7)} ${utc(value)}${state === '' ? '' : ` (${state})`}`)
  }

  lines.push(s.note)

  return lines.join('\n')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'jwt', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'jwt' }, async ($, e) => {
    const s = await strings($)
    const token = await input($, e.args)

    if (token === '') {
      return { text: s.usage }
    }

    return { text: decode(token, await $.clock.now(), s) }
  })
}
