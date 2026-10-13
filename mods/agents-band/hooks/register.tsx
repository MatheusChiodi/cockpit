import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'

import type { Worker } from '../types'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('agents-band')

const workers = atom({ plugin: 'agents-band', key: 'workers' } as const, [])

const ACTIVE = new Set(['pending', 'running', 'waiting'])

const refresh = async ($: EngineInterface): Promise<void> => {
  const listed = await $.agent.list().catch(() => [])
  const found: Worker[] = listed
    .filter(agent => ACTIVE.has(agent.status))
    .map(agent => ({ id: agent.id, label: (agent.name ?? agent.description ?? agent.type).slice(0, 28), status: agent.status }))

  await update($, workers, held => (JSON.stringify(held) === JSON.stringify(found) ? held : found))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // Subagentes mudam de estado sem evento no loop principal: um pulso curto resolve.
    $.clock.every(5000, () => void refresh($))

    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const spawned = await next(e)
    void refresh($)

    return spawned
  })

  on('turn.complete', async ($, e, next) => {
    await refresh($)

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const list = await read($, workers)

    if (e.props.hasSurvey || (await isOff($)) || list.length === 0) {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Text } = ui

    return row(
      ui,
      'sessao',
      'agentes',
      <Text wrap="truncate-end">
        <Text bold>{list.length}</Text> rodando
        <Text dimColor>
          {'  '}
          {list
            .slice(0, 5)
            .map(worker => worker.label)
            .join('  ')}
          {list.length > 5 ? `  +${list.length - 5}` : ''}
        </Text>
      </Text>,
      below,
    )
  })
}
