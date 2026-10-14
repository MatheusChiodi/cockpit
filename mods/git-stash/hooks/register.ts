import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const git = ($: EngineInterface, args: readonly string[]) =>
  $.process.run(['git', '--no-pager', ...args], { timeoutMs: 15000 }).catch(() => undefined)

const list = async ($: EngineInterface): Promise<string | undefined> => {
  const ran = await git($, ['stash', 'list'])

  return ran?.exitCode === 0 ? ran.stdout.trim() : undefined
}

const pop = async ($: EngineInterface): Promise<{ text: string }> => {
  const s = await strings($)
  const stashes = await list($)

  if (stashes === undefined) {
    return { text: s.noGit }
  }

  if (stashes === '') {
    return { text: s.noStashes }
  }

  const answer = await $.ui.ask(s.confirm(stashes.split('\n')[0] ?? ''), [s.yes, s.no]).catch(() => s.no)

  if (answer !== s.yes) {
    return { text: s.cancelled }
  }

  const ran = await git($, ['stash', 'pop'])

  if (ran === undefined) {
    return { text: s.noGit }
  }

  return { text: ran.exitCode === 0 ? s.popped : s.failed((ran.stderr || ran.stdout).trim().split('\n')[0] ?? '') }
}

const save = async ($: EngineInterface, message: string): Promise<{ text: string }> => {
  const s = await strings($)
  const ran = await git($, ['stash', 'push', '-m', message])

  if (ran === undefined) {
    return { text: s.noGit }
  }

  if (ran.exitCode !== 0) {
    return { text: s.failed(ran.stderr.trim().split('\n')[0] ?? '') }
  }

  return { text: /No local changes/i.test(ran.stdout) ? s.nothing : s.stashed(message) }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'gst', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'gst' }, async ($, e) => {
    const s = await strings($)
    const [first, ...rest] = e.args.trim().split(/\s+/)
    const action = first || 'list'
    const message = rest.join(' ')

    if (action === 'list' && message === '') {
      return { text: (await list($)) || s.noStashes }
    }

    if (action === 'pop' && message === '') {
      return pop($)
    }

    if (action === 'save' && message !== '') {
      return save($, message)
    }

    return { text: s.usage }
  })
}
