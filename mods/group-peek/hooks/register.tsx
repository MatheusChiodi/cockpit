import type { EngineInterface, Register, RenderChildren } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// The arguments that say best what a call was about, first one present wins.
const KEYS = ['command', 'file_path', 'path', 'pattern', 'url', 'query'] as const

const target = (input: unknown): string => {
  const args = (input ?? {}) as Record<string, unknown>

  for (const key of KEYS) {
    const value = args[key]

    if (typeof value === 'string' && value !== '') {
      return value.replace(/\s+/g, ' ')
    }
  }

  return ''
}

export const register: Register = on => {
  // The folded line counts calls; this adds what the live group is on, and what failed in a settled one.
  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    const drawn = await next(e)
    const { calls, isActive, isExpanded } = e.props
    const failed = calls.filter(call => call.isErrored).length
    const last = calls[calls.length - 1]

    if (isExpanded || last === undefined || (!isActive && failed === 0)) {
      return drawn
    }

    const { Box, Text } = $.ui.resolve(e)
    const s = await strings($)

    return (
      <Box flexDirection="column">
        {drawn as RenderChildren}
        {isActive && (
          <Text dimColor wrap="truncate-end">
            ▸ {last.tool} {target(last.input)}
          </Text>
        )}
        {failed > 0 && (
          <Text color="error" wrap="truncate-end">
            ✗ {s.failed(failed)}
          </Text>
        )}
      </Box>
    )
  })
}
