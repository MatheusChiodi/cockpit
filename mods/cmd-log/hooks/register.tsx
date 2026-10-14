import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { heading } from './kit'
import { STRINGS } from './strings'

import type { Run } from '../types'

const PANE = 'cmd-log'
const runs = atom({ plugin: 'cmd-log', key: 'runs' } as const, [])

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const begin = async ($: EngineInterface, id: string, command: string): Promise<number> => {
  const startedAt = await $.clock.now()
  const run: Run = { id, command: command.replace(/\s+/g, ' ').slice(0, 200), status: 'running', ms: 0 }
  await update($, runs, list => [...list, run].slice(-200))

  return startedAt
}

const finish = async ($: EngineInterface, id: string, startedAt: number, isOk: boolean) => {
  const ms = (await $.clock.now()) - startedAt
  await update($, runs, list =>
    list.map(run => (run.id === id ? { ...run, status: isOk ? 'ok' : 'failed', ms } : run)),
  )
}

const took = (ms: number): string => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'cmdlog', description: s.command })

    return next(e)
  })

  on('command.run', { command: 'cmdlog' }, async $ => {
    const s = await strings($)
    await $.ui.open({ id: PANE, title: s.title })

    return { text: s.opened }
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const startedAt = await begin($, e.tool_use_id, e.command)
    const ran = await next(e)
    await finish($, e.tool_use_id, startedAt, ran.deny === undefined && ran.isError !== true)

    return ran
  })

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => {
    const startedAt = await begin($, e.tool_use_id, e.command)
    const ran = await next(e)
    await finish($, e.tool_use_id, startedAt, ran.deny === undefined && ran.isError !== true)

    return ran
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const s = await strings($)
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const list = await read($, runs)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 6)
    const width = Math.max(12, e.props.bodyColumns - 12)
    const failed = list.filter(run => run.status === 'failed').length

    return (
      <Box flexDirection="column">
        {heading(ui, 'session', s.label, s.summary(list.length, failed), e.props.bodyColumns)}
        {list.length === 0 && <Text dimColor>{s.empty}</Text>}
        {list.slice(-room).map(run => (
          <Text wrap="truncate-end">
            <Text color={run.status === 'failed' ? 'error' : run.status === 'ok' ? 'success' : 'warning'} bold>
              {run.status === 'failed' ? '✗' : run.status === 'ok' ? '✓' : '…'}
            </Text>{' '}
            <Text dimColor>{(run.status === 'running' ? '' : took(run.ms)).padStart(6)}</Text>{' '}
            <Text color={run.status === 'failed' ? 'error' : 'text'}>{run.command.slice(0, width)}</Text>
          </Text>
        ))}
      </Box>
    )
  })
}
