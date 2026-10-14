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

const CAP = 400
const ROWS = 15
const SKIPPED = /\.(png|jpe?g|gif|ico|webp|pdf|zip|gz|woff2?|ttf|eot|mp[34]|mov|lock)$/i

const extOf = (path: string): string => {
  const name = path.slice(path.lastIndexOf('/') + 1)
  const dot = name.lastIndexOf('.')

  return dot > 0 ? name.slice(dot) : name
}

const countLines = (text: string): number =>
  text === '' ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0)

const count = async ($: EngineInterface, typed: string): Promise<{ text: string }> => {
  const s = await strings($)
  const at = typed === '' ? { rel: '.' } : await resolve($, typed)

  if (at === undefined) {
    return { text: s.outside(typed) }
  }

  const ran = await git($, ['ls-files', '--', at.rel])

  if (ran === undefined || ran.exitCode !== 0) {
    return { text: s.noGit }
  }

  const all = ran.stdout
    .split('\n')
    .map(line => line.trim())
    .filter(path => path !== '' && !SKIPPED.test(path))
  const sample = all.slice(0, CAP)
  const lengths = await Promise.all(sample.map(path => $.fs.read(path).then(countLines, () => undefined)))
  const groups = new Map<string, { files: number; lines: number }>()

  sample.forEach((path, at) => {
    const lines = lengths[at]

    if (lines !== undefined) {
      const group = groups.get(extOf(path)) ?? { files: 0, lines: 0 }
      group.files += 1
      group.lines += lines
      groups.set(extOf(path), group)
    }
  })

  if (groups.size === 0) {
    return { text: s.none(at.rel) }
  }

  const sorted = [...groups].sort((a, b) => b[1].lines - a[1].lines)
  const top = sorted.slice(0, ROWS)
  const rest = sorted.slice(ROWS).reduce((sum, [, g]) => ({ files: sum.files + g.files, lines: sum.lines + g.lines }), { files: 0, lines: 0 })
  const total = sorted.reduce((sum, [, g]) => ({ files: sum.files + g.files, lines: sum.lines + g.lines }), { files: 0, lines: 0 })
  const rows: [string, { files: number; lines: number }][] = [...top]

  if (rest.files > 0) {
    rows.push([s.other, rest])
  }

  rows.push([s.total, total])

  const width = Math.max(...rows.map(([name]) => name.length))
  const lines = rows.map(
    ([name, g]) => `${name.padEnd(width)}  ${String(g.files).padStart(5)} ${s.files}  ${String(g.lines).padStart(8)} ${s.lines}`,
  )

  return { text: (all.length > CAP ? [...lines, s.sampled(CAP, all.length)] : lines).join('\n') }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'loc', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'loc' }, ($, e) => count($, unquote(e.args)))
}
