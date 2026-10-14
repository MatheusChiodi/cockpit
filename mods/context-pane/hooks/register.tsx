import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { heading, meter } from './kit'
import { STRINGS } from './strings'

import type { Slice } from '../types'

const PANE = 'context-pane'
const reading = atom({ plugin: 'context-pane', key: 'window' } as const, null)

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const short = (count: number): string => (count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count))

const refresh = async ($: EngineInterface): Promise<void> => {
  const breakdown = (await $.session.usage({ breakdown: 'summary' })).context.breakdown

  if (breakdown === undefined) {
    return
  }

  const slices: Slice[] = breakdown.categories.flatMap(category =>
    category.kind === 'deferred' || category.tokens <= 0
      ? []
      : [{ name: category.name, tokens: category.tokens, kind: category.kind }],
  )
  const next = { total: breakdown.totalTokens, max: breakdown.rawMaxTokens, slices }

  // The same reading again must not redraw.
  if (JSON.stringify(await read($, reading)) !== JSON.stringify(next)) {
    await update($, reading, () => next)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'window', description: (await strings($)).command })

    return next(e)
  })

  on('command.run', { command: 'window' }, async $ => {
    const s = await strings($)
    await refresh($)
    await $.ui.open({ id: PANE, title: s.paneTitle })

    return { text: s.opened }
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      await refresh($)
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Button, Text } = ui
    const s = await strings($)
    const held = await read($, reading)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 8)
    const width = Math.max(8, Math.min(24, e.props.bodyColumns - 36))
    const percent = held === null || held.max === 0 ? 0 : Math.round((held.total / held.max) * 100)
    const summary = held === null ? '' : s.summary(short(held.total), short(held.max), percent)

    return (
      <Box flexDirection="column">
        {heading(ui, 'session', s.title, summary, e.props.bodyColumns)}
        <Button key="refresh" label={s.refresh} onPress={() => refresh($)} />
        {held === null && <Text dimColor>{s.empty}</Text>}
        {held?.slices.slice(0, room).map(slice => {
          const share = held.max === 0 ? 0 : (slice.tokens / held.max) * 100

          return (
            <Text wrap="truncate-end">
              <Text bold>{short(slice.tokens).padStart(6)}</Text> <Text dimColor>{`${Math.round(share)}%`.padStart(4)}</Text>{' '}
              {meter(ui, share, width, slice.kind === 'used' ? 'claude' : 'inactive')} {slice.name}
            </Text>
          )
        })}
      </Box>
    )
  })
}
