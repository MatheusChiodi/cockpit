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

const human = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let at = 0

  while (value >= 1024 && at < units.length - 1) {
    value /= 1024
    at += 1
  }

  return `${value.toFixed(1)} ${units[at]}`
}

const LABEL = 9

const row = (label: string, value: string): string => `${label.padEnd(LABEL)}${value}`

const folder = async ($: EngineInterface, rel: string): Promise<{ text: string }> => {
  const s = await strings($)
  const ran = await git($, rel === '.' ? ['ls-tree', '-r', '-l', 'HEAD'] : ['ls-tree', '-r', '-l', 'HEAD', `${rel}/`])

  if (ran === undefined || ran.exitCode !== 0) {
    return { text: s.noGit }
  }

  const files = ran.stdout.split('\n').flatMap(line => {
    const found = /^\d+ blob \w+\s+(\d+)\t(.+)$/.exec(line)

    return found === null ? [] : [{ size: Number(found[1]), path: found[2] ?? '' }]
  })

  if (files.length === 0) {
    return { text: s.none(rel) }
  }

  const biggest = files.reduce((top, file) => (file.size > top.size ? file : top))
  const total = files.reduce((sum, file) => sum + file.size, 0)

  return {
    text: [
      row(s.size, `${human(total)}  ${s.tracked}`),
      row(s.files, String(files.length)),
      row(s.biggest, `${biggest.path}  ${human(biggest.size)}`),
    ].join('\n'),
  }
}

const measure = async ($: EngineInterface, typed: string): Promise<{ text: string }> => {
  const s = await strings($)
  const at = typed === '' ? { full: await $.session.root(), rel: '.' } : await resolve($, typed)

  if (at === undefined) {
    return { text: s.outside(typed) }
  }

  const stat = await $.fs.stat(at.full).catch(() => undefined)

  if (stat === undefined) {
    return { text: s.missing(at.rel) }
  }

  if (stat.kind === 'dir') {
    return folder($, at.rel)
  }

  const text = await $.fs.read(at.full).catch(() => undefined)
  const lines = text === undefined ? [] : [row(s.lines, String(text === '' ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0)))]

  return { text: [row(s.size, human(stat.size)), ...lines].join('\n') }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'size', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'size' }, ($, e) => measure($, unquote(e.args)))
}
