import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const git = ($: EngineInterface, args: readonly string[]) =>
  $.process.run(['git', '--no-pager', ...args], { timeoutMs: 60000 }).catch(() => undefined)

// origin/HEAD when it is set, else origin/main, else origin/master.
const baseOf = async ($: EngineInterface): Promise<string | undefined> => {
  const head = await git($, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])

  if (head?.exitCode === 0 && head.stdout.trim() !== '') {
    return head.stdout.trim()
  }

  for (const candidate of ['origin/main', 'origin/master']) {
    const found = await git($, ['rev-parse', '--verify', '--quiet', candidate])

    if (found?.exitCode === 0) {
      return candidate
    }
  }

  return undefined
}

const sync = async ($: EngineInterface, kind: string): Promise<{ text: string }> => {
  const s = await strings($)
  const current = await git($, ['rev-parse', '--abbrev-ref', 'HEAD'])

  if (current === undefined || current.exitCode !== 0) {
    return { text: s.noGit }
  }

  const branch = current.stdout.trim()
  await git($, ['fetch', '--quiet', 'origin'])
  const base = await baseOf($)

  if (base === undefined) {
    return { text: s.noBase }
  }

  if (base === `origin/${branch}`) {
    return { text: s.onBase(branch) }
  }

  const counts = await git($, ['rev-list', '--left-right', '--count', `${base}...HEAD`])
  const [behind = 0, ahead = 0] = (counts?.stdout.trim().split(/\s+/) ?? []).map(n => Number.parseInt(n, 10) || 0)
  const state = s.state(branch, base, ahead, behind)

  if (kind === '') {
    return { text: state }
  }

  if (behind === 0) {
    return { text: `${state}\n${s.upToDate(base)}` }
  }

  const dirty = await git($, ['status', '--porcelain', '--untracked-files=no'])

  if (dirty === undefined || dirty.stdout.trim() !== '') {
    return { text: s.dirty }
  }

  const answer = await $.ui
    .ask(s.confirm(kind === 'rebase' ? s.rebase : s.merge, base, behind), [s.yes, s.no])
    .catch(() => s.no)

  if (answer !== s.yes) {
    return { text: s.cancelled }
  }

  const ran = await git($, [kind, base])

  if (ran === undefined) {
    return { text: s.noGit }
  }

  return {
    text: ran.exitCode === 0 ? s.done(kind, base) : s.failed(kind, (ran.stderr || ran.stdout).trim().split('\n')[0] ?? ''),
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'sync', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'sync' }, async ($, e) => {
    const kind = e.args.trim().toLowerCase()

    return kind === '' || kind === 'rebase' || kind === 'merge' ? sync($, kind) : { text: (await strings($)).usage }
  })
}
