import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderChildren } from 'claude-code'

import { STRINGS } from './strings'

import type { Run } from '../types'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const runs = atom({ plugin: 'tool-clock', key: 'runs' } as const, {})

const SLOW_MS = 1000
const KEEP = 400

const clock = (ms: number): string => {
  if (ms < SLOW_MS) {
    return `${ms}ms`
  }

  const seconds = ms / 1000

  return seconds < 60 ? `${seconds.toFixed(1)}s` : `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
}

const remember = async ($: EngineInterface, id: string, run: Run): Promise<void> => {
  await update($, runs, (all: Record<string, Run>): Record<string, Run> =>
    Object.fromEntries(Object.entries({ ...all, [id]: run }).slice(-KEEP)),
  )
}

export const register: Register = on => {
  // The row cannot time a call, so the call is timed here and the row reads it back.
  on('tool.call', async ($, e, next) => {
    const start = await $.clock.now()
    const ran = await next(e)
    const ms = (await $.clock.now()) - start

    await remember($, e.tool_use_id, { ms, sub: e.agentId !== undefined })

    return ran
  })

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const drawn = await next(e)
    const run = (await read($, runs))[e.props.tool_use_id]

    if (e.props.isRunning || run === undefined || (run.ms < SLOW_MS && !run.sub && !e.props.isErrored)) {
      return drawn
    }

    const { Box, Text } = $.ui.resolve(e)
    const s = await strings($)

    return (
      <Box>
        {drawn as RenderChildren}
        <Text dimColor wrap="truncate-end">
          {' '}
          {run.ms >= SLOW_MS && clock(run.ms)}
          {run.sub && `${run.ms >= SLOW_MS ? '  ' : ''}${s.sub}`}
        </Text>
        {e.props.isErrored && (
          <Text color="error" wrap="truncate-end">
            {' '}
            {s.failed}
          </Text>
        )}
      </Box>
    )
  })
}
