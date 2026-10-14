import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { heading } from './kit'
import { STRINGS } from './strings'

import type { Member } from '../types'

const PANE = 'agent-pane'
const members = atom({ plugin: 'agent-pane', key: 'members' } as const, [])

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const ACTIVE = new Set(['pending', 'running', 'waiting'])

const refresh = async ($: EngineInterface): Promise<void> => {
  const listed = await $.agent.list().catch(() => [])
  const found: Member[] = listed.map(agent => ({
    id: agent.id,
    label: (agent.name ?? agent.description).replace(/\s+/g, ' ').slice(0, 60),
    type: agent.type,
    status: agent.status,
  }))

  await update($, members, held => (JSON.stringify(held) === JSON.stringify(found) ? held : found))
}

// The timer only works while a subagent is active; spawns and turn ends cover the rest.
const pulse = async ($: EngineInterface): Promise<void> => {
  if ((await read($, members)).some(member => ACTIVE.has(member.status))) {
    await refresh($)
  }
}

const tone = (status: string) =>
  status === 'failed' || status === 'killed' ? 'error' : status === 'completed' ? 'success' : ACTIVE.has(status) ? 'warning' : 'inactive'

const mark = (status: string): string =>
  status === 'failed' || status === 'killed' ? '✗' : status === 'completed' ? '✓' : ACTIVE.has(status) ? '…' : '·'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'crew', description: (await strings($)).command })
    $.clock.every(4000, () => void pulse($))

    return next(e)
  })

  on('command.run', { command: 'crew' }, async $ => {
    const s = await strings($)
    await refresh($)
    await $.ui.open({ id: PANE, title: s.paneTitle })

    return { text: s.opened }
  })

  on('agent.spawn', async ($, e, next) => {
    const spawned = await next(e)
    await refresh($)

    return spawned
  })

  on('turn.complete', async ($, e, next) => {
    await refresh($)

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const s = await strings($)
    const list = await read($, members)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 6)
    const width = Math.max(10, e.props.bodyColumns - 40)
    const active = list.filter(member => ACTIVE.has(member.status)).length

    return (
      <Box flexDirection="column">
        {heading(ui, 'session', s.title, s.summary(list.length, active), e.props.bodyColumns)}
        {list.length === 0 && <Text dimColor>{s.empty}</Text>}
        {list
          .slice(-room)
          .reverse()
          .map(member => (
            <Text wrap="truncate-end">
              <Text color={tone(member.status)} bold>
                {mark(member.status)}
              </Text>{' '}
              <Text color={tone(member.status)}>{(s.status[member.status] ?? member.status).padEnd(10)}</Text>{' '}
              <Text bold>{member.type.slice(0, 16).padEnd(16)}</Text> <Text dimColor>{member.label.slice(0, width)}</Text>
            </Text>
          ))}
      </Box>
    )
  })
}
