import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'
import { STRINGS } from './strings'

import type { Worker } from '../types'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('agents-band')

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

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
    // Subagents change state without an event in the main loop: a short pulse covers it.
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
    const s = await strings($)

    return row(
      ui,
      'session',
      s.label,
      <Text wrap="truncate-end">
        <Text bold>{list.length}</Text> {s.running}
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
