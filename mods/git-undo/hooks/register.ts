import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const git = ($: EngineInterface, args: readonly string[]) =>
  $.process.run(['git', '--no-pager', ...args], { timeoutMs: 15000 }).catch(() => undefined)

const undo = async ($: EngineInterface): Promise<{ text: string }> => {
  const s = await strings($)
  const last = await git($, ['log', '-1', '--format=%h %s'])

  if (last === undefined) {
    return { text: s.noGit }
  }

  const commit = last.stdout.trim()
  const hasParent = await git($, ['rev-parse', '--verify', '--quiet', 'HEAD~1'])

  if (last.exitCode !== 0 || commit === '' || hasParent?.exitCode !== 0) {
    return { text: s.noCommit }
  }

  // A commit that any remote branch already holds is not ours to rewrite.
  const remotes = await git($, ['branch', '-r', '--contains', 'HEAD'])

  if (remotes === undefined || remotes.exitCode !== 0) {
    return { text: s.noGit }
  }

  if (remotes.stdout.trim() !== '') {
    return { text: s.pushed(commit) }
  }

  const answer = await $.ui.ask(s.confirm(commit), [s.yes, s.no]).catch(() => s.no)

  if (answer !== s.yes) {
    return { text: s.cancelled }
  }

  const reset = await git($, ['reset', '--soft', 'HEAD~1'])

  if (reset === undefined) {
    return { text: s.noGit }
  }

  return { text: reset.exitCode === 0 ? s.undone(commit) : s.failed(reset.stderr.trim().split('\n')[0] ?? '') }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'gundo', description: s.command })

    return next(e)
  })

  on('command.run', { command: 'gundo' }, $ => undo($))
}
