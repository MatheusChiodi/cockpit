import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const git = ($: EngineInterface, args: readonly string[]) =>
  $.process.run(['git', '--no-pager', ...args], { timeoutMs: 15000 }).catch(() => undefined)

const overview = async ($: EngineInterface): Promise<{ text: string }> => {
  const s = await strings($)
  const ran = await git($, ['status', '--porcelain=v1', '-uall'])

  if (ran === undefined || ran.exitCode !== 0) {
    return { text: s.noGit }
  }

  const rows = ran.stdout.split('\n').filter(line => line.length > 3)
  const group = (title: string, lines: string[]) =>
    lines.length === 0 ? [] : [`${title} (${lines.length})`, ...lines.map(line => `  ${line}`)]
  const staged = rows.filter(row => row[0] !== ' ' && row[0] !== '?').map(row => `${row[0]} ${row.slice(3)}`)
  const unstaged = rows.filter(row => row[1] !== ' ' && row[0] !== '?').map(row => `${row[1]} ${row.slice(3)}`)
  const untracked = rows.filter(row => row.startsWith('??')).map(row => row.slice(3))
  const text = [...group(s.staged, staged), ...group(s.unstaged, unstaged), ...group(s.untracked, untracked)]

  return { text: text.length === 0 ? s.clean : text.join('\n') }
}

const change = async ($: EngineInterface, paths: string[], unstage: boolean): Promise<{ text: string }> => {
  const s = await strings($)
  const question = unstage ? s.confirmRestore(paths.length) : s.confirmAdd(paths.length)
  const answer = await $.ui.ask(`${question} ${paths.join(' ')}`, [s.yes, s.no]).catch(() => s.no)

  if (answer !== s.yes) {
    return { text: s.cancelled }
  }

  const ran = await git($, unstage ? ['restore', '--staged', '--', ...paths] : ['add', '--', ...paths])

  if (ran === undefined) {
    return { text: s.noGit }
  }

  if (ran.exitCode !== 0) {
    return { text: s.failed((ran.stderr || ran.stdout).trim().split('\n')[0] ?? '') }
  }

  return { text: unstage ? s.restored(paths.length) : s.added(paths.length) }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'stage', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'stage' }, async ($, e) => {
    const words = e.args.trim().split(/\s+/).filter(word => word !== '')
    const unstage = words[0] === '-r'
    const paths = unstage ? words.slice(1) : words

    return paths.length === 0 ? overview($) : change($, paths, unstage)
  })
}
