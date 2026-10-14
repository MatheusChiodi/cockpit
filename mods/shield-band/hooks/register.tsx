import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'
import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('shield-band')

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const blocks = atom({ plugin: 'shield-band', key: 'blocks' } as const, { count: 0, last: '' })

export const register: Register = on => {
  // Counts the calls that a guard (or a permission rule) refused in this session.
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny !== undefined) {
      const reason = `${String(e.tool)}: ${ran.deny.replace(/\s+/g, ' ').slice(0, 90)}`
      await update($, blocks, held => ({ count: held.count + 1, last: reason }))
    }

    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const held = await read($, blocks)

    if (e.props.hasSurvey || (await isOff($)) || held.count === 0) {
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
        <Text color="permission" bold>
          {s.blocks(held.count)}
        </Text>
        <Text dimColor>  {held.last}</Text>
      </Text>,
      below,
    )
  })
}
