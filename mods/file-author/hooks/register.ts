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

const LABEL = 9

const who = async ($: EngineInterface, typed: string): Promise<{ text: string }> => {
  const s = await strings($)

  if (typed === '') {
    return { text: s.usage }
  }

  const at = await resolve($, typed)

  if (at === undefined) {
    return { text: s.outside(typed) }
  }

  const ran = await git($, ['log', '-n', '200', '--no-color', '--format=%an%x09%ar%x09%h%x09%s', '--', at.rel])

  if (ran === undefined || ran.exitCode !== 0) {
    return { text: s.noGit }
  }

  const commits = ran.stdout
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(line => line.split('\t'))

  const [last] = commits

  if (last === undefined) {
    return { text: s.noHistory(at.rel) }
  }

  const tally = new Map<string, number>()

  for (const [name = ''] of commits) {
    tally.set(name, (tally.get(name) ?? 0) + 1)
  }

  const authors = [...tally]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, n]) => `${name} ${n}`)
    .join('  ')

  return {
    text: [
      `${s.last.padEnd(LABEL)}${last[0]}  ${last[1]}  ${last[2]}`,
      `${''.padEnd(LABEL)}${(last[3] ?? '').slice(0, 90)}`,
      `${s.authors.padEnd(LABEL)}${authors}`,
    ].join('\n'),
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'who', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'who' }, ($, e) => who($, unquote(e.args)))
}
