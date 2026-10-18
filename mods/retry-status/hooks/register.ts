import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('retry-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// The command that is failing, how many runs in a row failed, and its text for the line.
const failing: { key: string; count: number; label: string } = { key: '', count: 0, label: '' }

const settle = async ($: EngineInterface, command: string, ran: { deny?: string; isError?: boolean }): Promise<void> => {
  if (ran.deny !== undefined) {
    return
  }

  const label = command.replace(/\s+/g, ' ').trim()

  if (ran.isError === true) {
    failing.count = failing.key === label ? failing.count + 1 : 1
    failing.key = label
    failing.label = label.slice(0, 40)
  } else if (failing.key === label) {
    // The command passed: the loop is over. Other commands passing say nothing about it.
    failing.key = ''
    failing.count = 0
  } else {
    return
  }

  const s = await strings($)

  await show($, failing.count >= 2 ? `${s.label} ✗ x${failing.count} · ${failing.label}` : undefined)
}

export const register: Register = on => {
  // A status line entry is not redrawn by a state change: clear it when the hub's switch moves.
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    await settle($, e.command, ran)

    return ran
  })

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => {
    const ran = await next(e)
    await settle($, e.command, ran)

    return ran
  })
}
