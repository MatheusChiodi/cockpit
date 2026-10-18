import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderChildren } from 'claude-code'

import { STRINGS } from './strings'

import type { Closed, Tally } from '../types'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const EMPTY: Tally = { tools: 0, failed: 0, files: [] }

const open = atom({ plugin: 'turn-summary', key: 'open' } as const, EMPTY)
const closed = atom({ plugin: 'turn-summary', key: 'closed' } as const, [])

const KEEP = 100

const CHANGERS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit']

const countCall = async ($: EngineInterface, tool: string, input: Record<string, unknown>, failed: boolean) => {
  const path = [input.file_path, input.notebook_path].find(value => typeof value === 'string')

  await update($, open, (tally: Tally): Tally => ({
    tools: tally.tools + 1,
    failed: tally.failed + (failed ? 1 : 0),
    files:
      !failed && CHANGERS.includes(tool) && typeof path === 'string' && !tally.files.includes(path)
        ? [...tally.files, path]
        : tally.files,
  }))
}

const closeTurn = async ($: EngineInterface, ms: number) => {
  const tally = await read($, open)

  await update($, closed, (list: Closed[]): Closed[] => [...list, { ...tally, ms }].slice(-KEEP))
  await update($, open, () => EMPTY)
}

export const register: Register = on => {
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)

    if (e.agentId === undefined) {
      await countCall($, String(e.tool), e as unknown as Record<string, unknown>, ran.deny !== undefined || ran.isError === true)
    }

    return ran
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      await closeTurn($, e.durationMs)
    }

    return next(e)
  })

  // The closing line knows only its duration, so the turn is found by it.
  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    const drawn = await next(e)
    const turn = (await read($, closed)).findLast(item => item.ms === e.props.durationMs)

    if (turn === undefined || turn.tools === 0) {
      return drawn
    }

    const { Box, Text } = $.ui.resolve(e)
    const s = await strings($)

    return (
      <Box flexDirection="column">
        {drawn as RenderChildren}
        <Text dimColor wrap="truncate-end">
          {s.tools(turn.tools)}
          {turn.files.length > 0 && `  ± ${s.files(turn.files.length)}`}
          {turn.failed > 0 && (
            <Text color="error">
              {'  '}✗ {s.failed(turn.failed)}
            </Text>
          )}
        </Text>
      </Box>
    )
  })
}
