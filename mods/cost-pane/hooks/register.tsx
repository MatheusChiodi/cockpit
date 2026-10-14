import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { heading, meter } from './kit'
import { STRINGS } from './strings'

const PANE = 'cost-pane'
const spend = atom({ plugin: 'cost-pane', key: 'spend' } as const, { last: 0, pending: 0, turns: [] })

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const money = (usd: number): string => `$${usd.toFixed(usd < 1 ? 3 : 2)}`

// The difference between two measurements of the session cost accrues to the running turn.
const measured = async ($: EngineInterface, usd: number): Promise<void> => {
  await update($, spend, held => ({ ...held, last: usd, pending: held.pending + Math.max(0, usd - held.last) }))
}

const closeTurn = async ($: EngineInterface): Promise<void> => {
  const held = await read($, spend)

  if (held.pending > 0) {
    await update($, spend, now => ({ ...now, pending: 0, turns: [...now.turns, now.pending].slice(-200) }))
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'spend', description: (await strings($)).command })

    return next(e)
  })

  on('command.run', { command: 'spend' }, async $ => {
    const s = await strings($)
    await $.ui.open({ id: PANE, title: s.paneTitle })

    return { text: s.opened }
  })

  on('session.measure', async ($, e, next) => {
    if (e.cost !== undefined) {
      await measured($, e.cost.usd)
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      await closeTurn($)
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const s = await strings($)
    const { turns } = await read($, spend)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 6)
    const top = Math.max(0.000001, ...turns)
    const total = turns.reduce((sum, usd) => sum + usd, 0)
    const width = Math.max(8, Math.min(24, e.props.bodyColumns - 16))

    return (
      <Box flexDirection="column">
        {heading(ui, 'session', s.title, s.summary(money(total), turns.length), e.props.bodyColumns)}
        {turns.length === 0 && <Text dimColor>{s.empty}</Text>}
        {turns
          .map((usd, index) => ({ usd, index: index + 1 }))
          .slice(-room)
          .reverse()
          .map(({ usd, index }) => (
            <Text wrap="truncate-end">
              <Text dimColor>{`#${index}`.padStart(4)}</Text> <Text bold>{money(usd).padStart(8)}</Text>{' '}
              {meter(ui, (usd / top) * 100, width, 'claude')}
            </Text>
          ))}
      </Box>
    )
  })
}
