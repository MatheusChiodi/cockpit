import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const git = ($: EngineInterface, args: readonly string[]) =>
  $.process.run(['git', '--no-pager', ...args], { timeoutMs: 30000 }).catch(() => undefined)

const firstLine = (text: string): string => text.trim().split('\n')[0] ?? ''

// The stash this command made when the person left `branch`, if it is still there.
const savedFor = async ($: EngineInterface, branch: string): Promise<string | undefined> => {
  const list = await git($, ['stash', 'list'])
  const line = list?.stdout.split('\n').find(row => row.trimEnd().endsWith(`gsw: ${branch}`))

  return line?.split(':')[0]
}

const switchTo = async ($: EngineInterface, branch: string): Promise<{ text: string }> => {
  const s = await strings($)
  const current = await git($, ['rev-parse', '--abbrev-ref', 'HEAD'])

  if (current === undefined || current.exitCode !== 0) {
    return { text: s.noGit }
  }

  const from = current.stdout.trim()

  if (from === branch) {
    return { text: s.already(branch) }
  }

  const exists = await git($, ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`])

  if (exists?.exitCode !== 0) {
    return { text: s.missing(branch) }
  }

  const status = await git($, ['status', '--porcelain'])
  const changed = (status?.stdout ?? '').split('\n').filter(line => line !== '').length
  const notes: string[] = []
  let stashed = false

  if (changed > 0) {
    const choice = await $.ui.ask(s.dirty(changed, from), [s.stashSwitch, s.switchOnly, s.cancel]).catch(() => s.cancel)

    if (choice !== s.stashSwitch && choice !== s.switchOnly) {
      return { text: s.cancelled }
    }

    if (choice === s.stashSwitch) {
      const saved = await git($, ['stash', 'push', '-u', '-m', `gsw: ${from}`])

      if (saved?.exitCode !== 0) {
        return { text: s.failed(firstLine(saved?.stderr ?? '')) }
      }

      stashed = true
      notes.push(s.stashed(from))
    }
  }

  const ran = await git($, ['switch', branch])

  if (ran?.exitCode !== 0) {
    // Leave the work where it was found.
    if (stashed) {
      await git($, ['stash', 'pop'])
    }

    return { text: s.failed(firstLine(ran?.stderr ?? '')) }
  }

  notes.push(s.switched(branch))

  const saved = await savedFor($, branch)

  if (saved !== undefined && (await $.ui.ask(s.restore(branch), [s.yes, s.no]).catch(() => s.no)) === s.yes) {
    const popped = await git($, ['stash', 'pop', saved])
    notes.push(popped?.exitCode === 0 ? s.restored : s.failed(firstLine(popped?.stderr ?? '')))
  }

  return { text: notes.join('\n') }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'gsw', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'gsw' }, async ($, e) => {
    const branch = e.args.trim()

    return branch === '' || /\s/.test(branch) ? { text: (await strings($)).usage } : switchTo($, branch)
  })
}
