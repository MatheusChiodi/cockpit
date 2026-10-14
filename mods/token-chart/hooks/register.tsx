import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { heading, meter } from './kit'
import { STRINGS } from './strings'

const PANE = 'token-chart'
const tokens = atom({ plugin: 'token-chart', key: 'tokens' } as const, [])

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const short = (count: number): string => (count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count))

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'tokens', description: (await strings($)).command })

    return next(e)
  })

  on('command.run', { command: 'tokens' }, async $ => {
    const s = await strings($)
    await $.ui.open({ id: PANE, title: s.paneTitle })

    return { text: s.opened }
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined && e.usage !== undefined) {
      const out = e.usage.output_tokens
      await update($, tokens, list => [...list, out].slice(-200))
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const s = await strings($)
    const list = await read($, tokens)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 6)
    const top = Math.max(1, ...list)
    const total = list.reduce((sum, count) => sum + count, 0)
    const width = Math.max(8, Math.min(32, e.props.bodyColumns - 16))

    return (
      <Box flexDirection="column">
        {heading(ui, 'session', s.title, s.summary(short(total), list.length), e.props.bodyColumns)}
        {list.length === 0 && <Text dimColor>{s.empty}</Text>}
        {list
          .map((count, index) => ({ count, index: index + 1 }))
          .slice(-room)
          .reverse()
          .map(({ count, index }) => (
            <Text wrap="truncate-end">
              <Text dimColor>{`#${index}`.padStart(4)}</Text> <Text bold>{short(count).padStart(6)}</Text>{' '}
              {meter(ui, (count / top) * 100, width, 'claude')}
            </Text>
          ))}
      </Box>
    )
  })
}
