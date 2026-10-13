import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Turn } from '../types'

const last = atom({ plugin: 'turn-timer', key: 'last' } as const, null)
const isHidden = atom({ plugin: 'turn-timer', key: 'isHidden' } as const, false)

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
    // Só o loop principal: turnos de subagentes não entram na faixa.
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
    // Desenha abaixo das faixas dos outros mods, sem escondê-las.
    const below = await next(e)
    const turn = await read($, last)

    if (e.props.hasSurvey || turn === null || (await read($, isHidden))) {
      return below
    }

    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {below}
        <Box>
        <Text dimColor>
          Último turno: {turn.seconds}s · {turn.tools} tools · {compact(turn.outputTokens)} tokens
          {turn.isAborted ? ' · interrompido' : ''}{' '}
        </Text>
        <Button key="hide" label="Ocultar" onPress={() => update($, isHidden, () => true)} />
        </Box>
      </Box>
    )
  })
}
