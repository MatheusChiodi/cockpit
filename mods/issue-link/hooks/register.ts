import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const gh = ($: EngineInterface, args: readonly string[]) =>
  $.process.run(['gh', ...args], { timeoutMs: 30000 }).catch(() => undefined)

const parse = <T>(text: string | undefined): T | undefined => {
  try {
    return text === undefined ? undefined : (JSON.parse(text) as T)
  } catch {
    return undefined
  }
}

const linking = async ($: EngineInterface, issue: number): Promise<{ text: string }> => {
  const s = await strings($)
  const view = await gh($, ['pr', 'view', '--json', 'number,body'])
  const pr = view?.exitCode === 0 ? parse<{ number?: number; body?: string }>(view.stdout) : undefined

  if (pr?.number === undefined) {
    return { text: s.noGh }
  }

  const body = pr.body ?? ''

  if (new RegExp(`\\b(close[sd]?|fix(e[sd])?|resolve[sd]?)\\s+#${issue}\\b`, 'i').test(body)) {
    return { text: s.already(pr.number, issue) }
  }

  const found = await gh($, ['issue', 'view', String(issue), '--json', 'title'])
  const title = found?.exitCode === 0 ? parse<{ title?: string }>(found.stdout)?.title : undefined

  if (title === undefined) {
    return { text: s.noIssue(issue) }
  }

  const answer = await $.ui.ask(s.confirm(issue, title, pr.number), [s.yes, s.no]).catch(() => s.no)

  if (answer !== s.yes) {
    return { text: s.cancelled }
  }

  const edited = await gh($, ['pr', 'edit', String(pr.number), '--body', `${body.trimEnd()}\n\nCloses #${issue}\n`.trimStart()])

  if (edited === undefined) {
    return { text: s.noGh }
  }

  return {
    text: edited.exitCode === 0 ? s.linked(pr.number, issue) : s.failed((edited.stderr || edited.stdout).trim().split('\n')[0] ?? ''),
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'closes', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'closes' }, async ($, e) => {
    const typed = /^#?(\d+)$/.exec(e.args.trim())

    return typed === null ? { text: (await strings($)).usage } : linking($, Number(typed[1]))
  })
}
