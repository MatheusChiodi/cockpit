import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'
import { STRINGS } from './strings'

import type { Turn } from '../types'

const last = atom({ plugin: 'turn-timer', key: 'last' } as const, null)
const isHidden = atom({ plugin: 'turn-timer', key: 'isHidden' } as const, false)

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const compact = (tokens: number): string =>
  tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens)

export const register: Register = on => {
  let tools = 0

  on('turn.start', ($, e, next) => {
    tools = 0

    return next(e)
  })

  on('tool.call', ($, e, next) => {
    if (e.agentId === undefined) {
      tools += 1
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    // Main loop only: subagent turns stay out of the band.
    if (e.agentId === undefined) {
      const turn: Turn = {
        seconds: Math.round(e.durationMs / 1000),
        tools,
        outputTokens: e.usage?.output_tokens ?? 0,
        isAborted: e.isAborted,
      }
      await update($, last, () => turn)
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // Draws beneath the other mods' bands without hiding them.
    const below = await next(e)
    const turn = await read($, last)

    if (e.props.hasSurvey || turn === null || (await read($, isHidden))) {
      return below
    }

    const s = await strings($)
    const ui = $.ui.resolve(e)
    const { Button, Text } = ui

    return row(
      ui,
      'session',
      s.label,
      [
        <Text>
          <Text bold>{turn.seconds}s</Text>
          <Text dimColor>
            {'  '}
            {s.detail(turn.tools, compact(turn.outputTokens), turn.isAborted)}
            {'  '}
          </Text>
        </Text>,
        <Button key="hide" label={s.hide} onPress={() => update($, isHidden, () => true)} />,
      ],
      below,
    )
  })
}
