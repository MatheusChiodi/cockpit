import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('last-cmd-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const took = (ms: number): string => {
  if (ms < 1000) {
    return `${ms}ms`
  }

  const seconds = ms / 1000

  return seconds < 60 ? `${seconds.toFixed(1)}s` : `${Math.floor(seconds / 60)}m${String(Math.round(seconds % 60)).padStart(2, '0')}s`
}

// The last command stays on the line until the next one: how the shell left things is always in sight.
const watch = async <R extends { deny?: string; isError?: boolean; result?: unknown }>(
  $: EngineInterface,
  command: string,
  run: () => Promise<R>,
): Promise<R> => {
  const startedAt = await $.clock.now()
  const ran = await run()
  const endedAt = await $.clock.now()

  // A refused call never ran: the line keeps the command before it.
  if (ran.deny === undefined) {
    const s = await strings($)
    const isInterrupted = (ran.result as { interrupted?: boolean } | undefined)?.interrupted === true
    const state = isInterrupted ? `✗ ${s.interrupted}` : ran.isError === true ? '✗' : '✓'
    const what = command.replace(/\s+/g, ' ').trim().slice(0, 40)

    await show($, `${s.label} ${state} ${took(endedAt - startedAt)} · ${what}`)
  }

  return ran
}

export const register: Register = on => {
  // A status line entry is not redrawn by a state change: clear it when the hub's switch moves.
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('tool.call', { tool: 'Bash' }, ($, e, next) => watch($, e.command, () => next(e)))

  on('tool.call', { tool: 'PowerShell' }, ($, e, next) => watch($, e.command, () => next(e)))
}
