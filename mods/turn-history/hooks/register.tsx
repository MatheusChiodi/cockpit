import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { heading } from './kit'
import { STRINGS } from './strings'

const PANE = 'turn-history'
const turns = atom({ plugin: 'turn-history', key: 'turns' } as const, [])
// Tool calls of the main loop since the last turn ended.
const calls = atom({ plugin: 'turn-history', key: 'calls' } as const, 0)

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const took = (ms: number): string => (ms >= 60000 ? `${Math.floor(ms / 60000)}m${Math.round((ms % 60000) / 1000)}s` : `${(ms / 1000).toFixed(1)}s`)

const finish = async ($: EngineInterface, ms: number, tokens: number, failed: boolean) => {
  const made = await read($, calls)
  await update($, calls, () => 0)
  await update($, turns, list => [...list, { ms, calls: made, tokens, failed }].slice(-200))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'turns', description: (await strings($)).command })

    return next(e)
  })

  on('command.run', { command: 'turns' }, async $ => {
    const s = await strings($)
    await $.ui.open({ id: PANE, title: s.paneTitle })

    return { text: s.opened }
  })

  on('tool.call', async ($, e, next) => {
    if (e.agentId === undefined) {
      await update($, calls, count => count + 1)
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      await finish($, e.durationMs, e.usage?.output_tokens ?? 0, e.reason !== 'answer')
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const s = await strings($)
    const list = await read($, turns)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 6)
    const failed = list.filter(turn => turn.failed).length

    return (
      <Box flexDirection="column">
        {heading(ui, 'session', s.title, s.summary(list.length, failed), e.props.bodyColumns)}
        {list.length === 0 && <Text dimColor>{s.empty}</Text>}
        {list
          .map((turn, index) => ({ turn, index: index + 1 }))
          .slice(-room)
          .reverse()
          .map(({ turn, index }) => (
            <Text wrap="truncate-end">
              <Text color={turn.failed ? 'error' : 'success'} bold>
                {turn.failed ? '✗' : '✓'}
              </Text>{' '}
              <Text dimColor>{`#${index}`.padStart(4)}</Text> <Text bold>{took(turn.ms).padStart(7)}</Text>{' '}
              <Text dimColor>{s.calls(turn.calls).padStart(11)}</Text>{' '}
              <Text dimColor>{s.tokens(turn.tokens).padStart(10)}</Text>
            </Text>
          ))}
      </Box>
    )
  })
}
