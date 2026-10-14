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

const opener = async ($: EngineInterface, isWindows: boolean): Promise<string> => {
  if (isWindows) {
    return 'explorer'
  }

  const kernel = await $.process.run(['uname'], { timeoutMs: 5000 }).catch(() => undefined)

  return kernel?.stdout.trim() === 'Darwin' ? 'open' : 'xdg-open'
}

const open = async ($: EngineInterface, typed: string): Promise<{ text: string }> => {
  const s = await strings($)

  if (typed === '') {
    return { text: s.usage }
  }

  const isWindows = (await $.env.get('OS')) === 'Windows_NT'
  const found = within(await $.session.root(), typed, isWindows)

  if (found === undefined) {
    return { text: s.outside(typed) }
  }

  if (!(await $.fs.exists(found.full))) {
    return { text: s.missing(found.rel) }
  }

  // explorer exits 1 even when it opened the item, so only a refusal to start counts as failure.
  const ran = await $.process.run([await opener($, isWindows), found.full], { timeoutMs: 10000 }).catch(() => undefined)

  return { text: ran === undefined || (!isWindows && ran.exitCode !== 0) ? s.failed : s.opened(found.rel) }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'open', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'open' }, ($, e) => open($, e.args.trim().replace(/^"(.*)"$/, '$1')))
}
