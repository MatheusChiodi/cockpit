import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderChildren } from 'claude-code'

import { STRINGS } from './strings'

import type { Stamp } from '../types'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const stamps = atom({ plugin: 'prompt-stamp', key: 'stamps' } as const, [])

const KEEP = 200

export const register: Register = on => {
  // The row cannot know when it was typed, so the time is taken at submit and read back by text.
  on('prompt.submit', async ($, e, next) => {
    const entered = await next(e)

    if (entered.drop === undefined && e.origin.kind === 'composer') {
      const at = await $.clock.now()
      await update($, stamps, (list: Stamp[]): Stamp[] => [...list, { text: e.text, at }].slice(-KEEP))
    }

    return entered
  })

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const drawn = await next(e)

    if (e.props.isExpanded) {
      return drawn
    }

    const s = await strings($)
    const sender = e.props.from?.name
    const stamp = (await read($, stamps)).findLast(item => item.text === e.props.text)

    if (sender === undefined && stamp === undefined) {
      return drawn
    }

    const { Box, Text } = $.ui.resolve(e)
    const note =
      sender !== undefined ? s.from(sender) : new Date(stamp?.at ?? 0).toLocaleTimeString(s.locale, { hour12: false, hour: '2-digit', minute: '2-digit' })

    return (
      <Box>
        {drawn as RenderChildren}
        <Text dimColor wrap="truncate-end">
          {' '}
          {note}
        </Text>
      </Box>
    )
  })
}
