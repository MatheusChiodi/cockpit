import type { EngineInterface, Register, RenderChildren } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Shorter outputs fit in one look and need no count.
const MIN_LINES = 20

export const register: Register = on => {
  on('ui.render', { component: 'CommandOutput' }, async ($, e, next) => {
    const drawn = await next(e)
    const count = e.props.text.split('\n').length

    if (count < MIN_LINES) {
      return drawn
    }

    const { Box, Text } = $.ui.resolve(e)
    const s = await strings($)

    return (
      <Box flexDirection="column">
        <Text dimColor wrap="truncate-end">
          /{e.props.command} {s.lines(count)}
        </Text>
        {drawn as RenderChildren}
      </Box>
    )
  })
}
