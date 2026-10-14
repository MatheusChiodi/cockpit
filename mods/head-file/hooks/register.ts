import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const ABSOLUTE = /^([A-Za-z]:|[\\/])/

// The segments of a path with "." and ".." folded away (a ".." at the top is dropped).
const segments = (path: string): string[] => {
  const out: string[] = []

  for (const part of path.replaceAll('\\', '/').split('/')) {
    if (part === '..') {
      out.pop()
    } else if (part !== '' && part !== '.') {
      out.push(part)
    }
  }

  return out
}

// The path resolved against the root, or undefined when it lands outside it.
const within = (root: string, typed: string, isWindows: boolean): { full: string; rel: string } | undefined => {
  const base = segments(root)
  const target = segments(ABSOLUTE.test(typed) ? typed : `${root}/${typed}`)
  const fold = (part: string) => (isWindows ? part.toLowerCase() : part)

  if (target.length < base.length || base.some((part, at) => fold(part) !== fold(target[at] ?? ''))) {
    return undefined
  }

  const lead = isWindows ? '' : '/'
  const sep = isWindows ? '\\' : '/'

  return { full: lead + target.join(sep), rel: target.slice(base.length).join('/') || '.' }
}

const resolve = async ($: EngineInterface, typed: string) =>
  within(await $.session.root(), typed, (await $.env.get('OS')) === 'Windows_NT')

const unquote = (text: string): string => text.trim().replace(/^"(.*)"$/, '$1')

// Files that hold credentials: their content is never printed. Templates (.env.example) are fine.
const SECRET =
  /(^|\/)(\.env(\.(?!example|sample|template|dist)[^/]*)?|\.npmrc|\.netrc|\.pgpass|id_(rsa|dsa|ecdsa|ed25519)|[^/]*\.(pem|key|p12|pfx|jks|keystore)|[^/]*(secret|credential)s?[^/]*\.(json|ya?ml|toml|env|txt))$/i

const DEFAULT = 20
const MAX = 60

const head = async ($: EngineInterface, typed: string): Promise<{ text: string }> => {
  const s = await strings($)
  const found = /^(.*?)(?:\s+(\d+))?$/.exec(typed.trim())
  const name = unquote(found?.[1] ?? '')

  if (name === '') {
    return { text: s.usage }
  }

  const count = Math.min(Math.max(Number(found?.[2] ?? DEFAULT), 1), MAX)
  const at = await resolve($, name)

  if (at === undefined) {
    return { text: s.outside(name) }
  }

  if (SECRET.test(at.rel)) {
    return { text: s.secret(at.rel) }
  }

  const stat = await $.fs.stat(at.full).catch(() => undefined)

  if (stat === undefined) {
    return { text: s.missing(at.rel) }
  }

  if (stat.kind !== 'file') {
    return { text: s.notFile(at.rel) }
  }

  const text = await $.fs.read(at.full).catch(() => undefined)

  if (text === undefined) {
    return { text: s.unreadable(at.rel) }
  }

  const lines = text.replace(/\n$/, '').split('\n')

  if (text === '') {
    return { text: s.empty(at.rel) }
  }

  const rows = lines.slice(0, count).map((line, index) => `${String(index + 1).padStart(4)}  ${line.slice(0, 120)}`)

  return { text: (lines.length > count ? [...rows, s.more(lines.length - count)] : rows).join('\n') }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'head', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'head' }, ($, e) => head($, e.args))
}
