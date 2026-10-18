import type { EngineInterface, Register, RenderChildren } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Shorter blocks are read at a glance and need no size.
const MIN_WORDS = 150

export const register: Register = on => {
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const drawn = await next(e)
    const text = e.props.text
    const words = text.split(/\s+/).filter(word => word !== '').length

    if (e.props.isSummary === true || words < MIN_WORDS) {
      return drawn
    }

    const fences = (text.match(/^\s*```/gm) ?? []).length
    const blocks = Math.floor(fences / 2)
    const { Box, Text } = $.ui.resolve(e)
    const s = await strings($)

    return (
      <Box flexDirection="column">
        {drawn as RenderChildren}
        <Text dimColor wrap="truncate-end">
          {'  '}
          {s.words(words)}
          {blocks > 0 && `  ${s.code(blocks)}`}
        </Text>
      </Box>
    )
  })
}
