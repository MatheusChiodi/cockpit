import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// Failures in a row at the same thing before the toast.
const TRIES = 4
const TOAST_MS = 12000
// For these the second word says what is being run: "npm test", not just "npm".
const RUNNERS = new Set(['npm', 'npx', 'yarn', 'pnpm', 'bun', 'cargo', 'go', 'dotnet', 'mvn', 'gradle', 'make', 'docker', 'pip', 'python', 'node'])

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Module state: the thing being retried and how many times in a row it failed.
const streak: { what: string; tries: number } = { what: '', tries: 0 }

// "cd app && npm run build --silent" is "npm run": the last step, its program and, for a runner, its subcommand.
const whatOf = (command: string): string => {
  const step = command.split('&&').at(-1)?.trim() ?? ''
  const words = step.split(/\s+/).filter(word => word !== '')
  const first = (words[0] ?? '').toLowerCase()

  return RUNNERS.has(first) && words[1] !== undefined ? `${first} ${words[1].toLowerCase()}` : first
}

const watch = async <R extends { deny?: string; isError?: boolean }>(
  $: EngineInterface,
  command: string,
  run: () => Promise<R>,
): Promise<R> => {
  const ran = await run()
  const what = whatOf(command)

  if (ran.deny !== undefined || what === '') {
    return ran
  }

  if (ran.isError !== true) {
    if (what === streak.what) {
      streak.tries = 0
    }

    return ran
  }

  streak.tries = what === streak.what ? streak.tries + 1 : 1
  streak.what = what

  // Said once per streak, at the exact count; more failures stay quiet until a success starts it over.
  if (streak.tries === TRIES) {
    $.ui.toast((await strings($)).stuck(what, TRIES), { timeoutMs: TOAST_MS })
  }

  return ran
}

export const register: Register = on => {
  on('session.start', (_$, e, next) => {
    streak.what = ''
    streak.tries = 0

    return next(e)
  })

  on('tool.call', { tool: 'Bash' }, ($, e, next) => watch($, e.command, () => next(e)))

  on('tool.call', { tool: 'PowerShell' }, ($, e, next) => watch($, e.command, () => next(e)))
}
