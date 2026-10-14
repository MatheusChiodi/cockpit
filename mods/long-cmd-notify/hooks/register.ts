import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const MIN_SECONDS = 120
const COMMAND_CHARS = 60

const took = (seconds: number): string =>
  `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`

const short = (command: string): string => {
  const line = command.trim().split('\n')[0] ?? ''

  return line.length > COMMAND_CHARS ? `${line.slice(0, COMMAND_CHARS - 1)}…` : line
}

// Times the command; a run of two minutes or more that was not refused or interrupted notifies once.
const watch = async <R extends { deny?: string; isError?: boolean; result?: unknown }>(
  $: EngineInterface,
  command: string,
  isMain: boolean,
  run: () => Promise<R>,
): Promise<R> => {
  const startedAt = await $.clock.now()
  const ran = await run()
  const seconds = Math.round(((await $.clock.now()) - startedAt) / 1000)

  if (isMain && ran.deny === undefined && (ran.result as { interrupted?: boolean } | undefined)?.interrupted !== true && seconds >= MIN_SECONDS) {
    const s = await strings($)
    const text = ran.isError === true ? s.failed(took(seconds), short(command)) : s.ok(took(seconds), short(command))
    await $.ui.notify(text, { title: s.title }).catch(() => undefined)
  }

  return ran
}

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, ($, e, next) =>
    watch($, e.command, (e as { agentId?: string }).agentId === undefined, () => next(e)),
  )

  on('tool.call', { tool: 'PowerShell' }, ($, e, next) =>
    watch($, e.command, (e as { agentId?: string }).agentId === undefined, () => next(e)),
  )
}
