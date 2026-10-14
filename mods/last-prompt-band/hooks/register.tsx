import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'
import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('last-prompt-band')

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const last = atom({ plugin: 'last-prompt-band', key: 'last' } as const, '')

export const register: Register = on => {
  on('prompt.submit', async ($, e, next) => {
    const entered = await next(e)

    // Only what the person typed: agent messages and notifications are left out.
    if (entered.drop === undefined && e.origin.kind === 'composer') {
      const line = e.text.replace(/\s+/g, ' ').trim().slice(0, 140)
      await update($, last, () => line)
    }

    return entered
  })

  // After a long answer, what was asked has already scrolled off the screen.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const text = await read($, last)

    if (e.props.hasSurvey || (await isOff($)) || text === '') {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Text } = ui
    const s = await strings($)

    return row(
      ui,
      'session',
      s.label,
      <Text dimColor italic wrap="truncate-end">
        {text}
      </Text>,
      below,
    )
  })
}
