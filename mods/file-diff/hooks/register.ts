import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Runs git on the host; undefined when git cannot start.
const git = async ($: EngineInterface, args: readonly string[]) =>
  $.process.run(['git', '--no-pager', ...args], { timeoutMs: 15000 }).catch(() => undefined)

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

const CAP = 40

const diff = async ($: EngineInterface, typed: string): Promise<{ text: string }> => {
  const s = await strings($)

  if (typed === '') {
    return { text: s.usage }
  }

  const at = await resolve($, typed)

  if (at === undefined) {
    return { text: s.outside(typed) }
  }

  if (SECRET.test(at.rel)) {
    return { text: s.secret(at.rel) }
  }

  const ran = await git($, ['diff', 'HEAD', '--no-color', '--unified=2', '--', at.rel])

  if (ran === undefined || ran.exitCode !== 0) {
    return { text: s.noGit }
  }

  const lines = ran.stdout
    .split('\n')
    .filter(line => !line.startsWith('diff --git') && !line.startsWith('index '))

  while (lines.at(-1) === '') {
    lines.pop()
  }

  if (lines.length === 0) {
    return { text: s.clean(at.rel) }
  }

  return { text: (lines.length > CAP ? [...lines.slice(0, CAP), s.more(lines.length - CAP)] : lines).join('\n') }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'fdiff', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'fdiff' }, ($, e) => diff($, unquote(e.args)))
}
