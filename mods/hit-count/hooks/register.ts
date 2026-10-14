import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Runs git on the host; undefined when git cannot start.
const git = async ($: EngineInterface, args: readonly string[]) =>
  $.process.run(['git', '--no-pager', ...args], { timeoutMs: 15000 }).catch(() => undefined)

const CAP = 20

const hits = async ($: EngineInterface, typed: string): Promise<{ text: string }> => {
  const s = await strings($)

  if (typed === '') {
    return { text: s.usage }
  }

  const ran = await git($, ['grep', '-c', '-I', '--no-color', '-F', '-e', typed])

  if (ran === undefined || (ran.exitCode !== 0 && ran.exitCode !== 1)) {
    return { text: s.noGit }
  }

  const files = ran.stdout.split('\n').flatMap(line => {
    const found = /^(.*):(\d+)$/.exec(line)

    return found === null ? [] : [{ path: found[1] ?? '', n: Number(found[2]) }]
  })

  if (files.length === 0) {
    return { text: s.none(typed) }
  }

  files.sort((a, b) => b.n - a.n || a.path.localeCompare(b.path))

  const total = files.reduce((sum, file) => sum + file.n, 0)
  const rows = files.slice(0, CAP).map(file => `${String(file.n).padStart(5)}  ${file.path}`)

  return {
    text: [...rows, ...(files.length > CAP ? [s.more(files.length - CAP)] : []), s.total(total, files.length)].join('\n'),
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'hits', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'hits' }, ($, e) => hits($, e.args.trim()))
}
