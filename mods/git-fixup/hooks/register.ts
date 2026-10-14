import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const git = ($: EngineInterface, args: readonly string[]) =>
  $.process.run(['git', '--no-pager', ...args], { timeoutMs: 15000 }).catch(() => undefined)

const fixup = async ($: EngineInterface, target: string): Promise<{ text: string }> => {
  const s = await strings($)
  const staged = await git($, ['diff', '--cached', '--quiet'])

  if (staged === undefined) {
    return { text: s.noGit }
  }

  // --quiet exits 1 when there is a difference, 0 when nothing is staged.
  if (staged.exitCode === 0) {
    return { text: s.nothingStaged }
  }

  const found = await git($, ['log', '-1', '--format=%h %s', target, '--'])

  if (found === undefined) {
    return { text: s.noGit }
  }

  const commit = found.stdout.trim()

  if (found.exitCode !== 0 || commit === '') {
    return { text: s.unknown(target) }
  }

  const answer = await $.ui.ask(s.confirm(commit), [s.yes, s.no]).catch(() => s.no)

  if (answer !== s.yes) {
    return { text: s.cancelled }
  }

  const ran = await git($, ['commit', `--fixup=${target}`])

  if (ran === undefined) {
    return { text: s.noGit }
  }

  return { text: ran.exitCode === 0 ? s.done(commit) : s.failed((ran.stderr || ran.stdout).trim().split('\n')[0] ?? '') }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'fixup', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'fixup' }, ($, e) => fixup($, e.args.trim().split(/\s+/)[0] || 'HEAD'))
}
