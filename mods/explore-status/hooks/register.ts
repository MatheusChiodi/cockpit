import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('explore-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const READS = new Set(['Read', 'Grep', 'Glob'])
const EDITS = new Set(['Edit', 'Write', 'NotebookEdit'])

// Too few calls say nothing about what the turn is doing.
const MIN_CALLS = 4

const turn = { reads: 0, edits: 0 }

const draw = async ($: EngineInterface): Promise<void> => {
  if (turn.reads + turn.edits < MIN_CALLS) {
    return show($, undefined)
  }

  const s = await strings($)
  const state = turn.reads >= 4 * Math.max(turn.edits, 1) ? s.exploring : turn.edits >= turn.reads ? s.changing : s.mixed

  return show($, `${s.label} ${s.reads(turn.reads)} · ${s.edits(turn.edits)} · ${state}`)
}

export const register: Register = on => {
  // A status line entry is not redrawn by a state change: clear it when the hub's switch moves.
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('turn.start', async ($, e, next) => {
    turn.reads = 0
    turn.edits = 0
    await show($, undefined)

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    const name = String(e.tool)

    // Main loop only, and only calls that ran: a refused read explored nothing.
    if (e.agentId === undefined && ran.deny === undefined && (READS.has(name) || EDITS.has(name))) {
      turn[READS.has(name) ? 'reads' : 'edits'] += 1
      await draw($)
    }

    return ran
  })
}
