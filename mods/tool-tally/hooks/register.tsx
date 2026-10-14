import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { heading, meter } from './kit'
import { STRINGS } from './strings'

const PANE = 'tool-tally'
const counts = atom({ plugin: 'tool-tally', key: 'counts' } as const, {})

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'tally', description: s.command })

    return next(e)
  })

  on('command.run', { command: 'tally' }, async $ => {
    const s = await strings($)
    await $.ui.open({ id: PANE, title: s.title })

    return { text: s.opened }
  })

  on('tool.call', async ($, e, next) => {
    const tool = String(e.tool)
    await update($, counts, held => ({ ...held, [tool]: (held[tool] ?? 0) + 1 }))

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const s = await strings($)
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const rows = Object.entries(await read($, counts)).sort((a, b) => b[1] - a[1])
    const total = rows.reduce((sum, [, count]) => sum + count, 0)
    const top = rows[0]?.[1] ?? 1
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 6)

    return (
      <Box flexDirection="column">
        {heading(ui, 'session', s.label, s.calls(total), e.props.bodyColumns)}
        {rows.length === 0 && <Text dimColor>{s.empty}</Text>}
        {rows.slice(0, room).map(([tool, count]) => (
          <Text wrap="truncate-end">
            <Text bold>{String(count).padStart(4)}</Text> {meter(ui, (count / top) * 100, 14, 'claude')} {tool}
          </Text>
        ))}
      </Box>
    )
  })
}
