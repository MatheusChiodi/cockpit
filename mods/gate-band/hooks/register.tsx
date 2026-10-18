import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'
import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('gate-band')

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const EMPTY = { denied: 0, asked: 0, last: '' }

const gate = atom({ plugin: 'gate-band', key: 'gate' } as const, EMPTY)

const short = (tool: string, why: string): string => `${tool}: ${why.replace(/\s+/g, ' ').slice(0, 80)}`

export const register: Register = on => {
  on('turn.start', async ($, e, next) => {
    const held = await read($, gate)

    if (held.denied > 0 || held.asked > 0) {
      await update($, gate, () => EMPTY)
    }

    return next(e)
  })

  // A guard or a permission rule refused the call.
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny !== undefined && e.agentId === undefined) {
      await update($, gate, held => ({ ...held, denied: held.denied + 1, last: short(String(e.tool), ran.deny ?? '') }))
    }

    return ran
  })

  // The verdict is an ask: the call stopped for the person. A query without an id is not a call.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)

    if (verdict.decision === 'ask' && e.tool_use_id !== undefined && e.agentId === undefined) {
      await update($, gate, held => ({
        ...held,
        asked: held.asked + 1,
        last: short(e.tool, verdict.reason ?? ''),
      }))
    }

    return verdict
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const held = await read($, gate)

    if (e.props.hasSurvey || (await isOff($)) || (held.denied === 0 && held.asked === 0)) {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Text } = ui
    const s = await strings($)

    return row(
      ui,
      'session',
      s.label,
      <Text wrap="truncate-end">
        {held.denied > 0 && (
          <Text color="error" bold>
            {s.denied(held.denied)}
            {'  '}
          </Text>
        )}
        {held.asked > 0 && (
          <Text color="warning" bold>
            {s.asked(held.asked)}
            {'  '}
          </Text>
        )}
        <Text dimColor>
          {s.tail}  {held.last}
        </Text>
      </Text>,
      below,
    )
  })
}
