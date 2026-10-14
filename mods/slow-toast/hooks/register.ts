import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const SLOW_MS = 60_000

const human = (ms: number): string => {
  const seconds = Math.round(ms / 1000)

  return seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`
}

const short = (command: string): string => {
  const line = (command.split('\n')[0] ?? command).trim()

  return line.length > 60 ? `${line.slice(0, 59)}…` : line
}

const watch = async <R extends { deny?: string }>(
  $: EngineInterface,
  command: string,
  run: () => Promise<R>,
): Promise<R> => {
  const startedAt = await $.clock.now()
  const ran = await run()
  const took = (await $.clock.now()) - startedAt

  if (ran.deny === undefined && took >= SLOW_MS) {
    $.ui.toast((await strings($)).slow(short(command), human(took)), { timeoutMs: 8000 })
  }

  return ran
}

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, ($, e, next) => watch($, e.command, () => next(e)))

  on('tool.call', { tool: 'PowerShell' }, ($, e, next) => watch($, e.command, () => next(e)))
}
