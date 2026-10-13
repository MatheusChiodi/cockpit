import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Usage } from '../types'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('usage-band')

const usage = atom({ plugin: 'usage-band', key: 'usage' } as const, null)

const LABEL: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: 'gasto' }

const tone = (percent: number): 'success' | 'warning' | 'error' =>
  percent >= 85 ? 'error' : percent >= 60 ? 'warning' : 'success'

const bar = (percent: number, width: number): string => {
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * width)

  return `${'█'.repeat(filled)}${'░'.repeat(width - filled)}`
}

export const register: Register = on => {
  on('session.measure', async ($, e, next) => {
    const measured: Usage = {
      percent: e.context.percent ?? 0,
      usd: e.cost?.usd ?? null,
      limits: e.rateLimits.map(limit => ({ kind: limit.kind, percent: limit.percentUsed })),
    }
    await update($, usage, () => measured)

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const measured = await read($, usage)

    if (e.props.hasSurvey || (await isOff($)) || measured === null) {
      return below
    }

    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {below}
        <Text wrap="truncate-end">
          <Text dimColor>contexto </Text>
          <Text color={tone(measured.percent)}>{bar(measured.percent, 12)}</Text> {measured.percent}%
          {measured.limits.map(limit => (
            <Text>
              <Text dimColor> · {LABEL[limit.kind] ?? limit.kind} </Text>
              <Text color={tone(limit.percent)}>{bar(limit.percent, 6)}</Text> {Math.round(limit.percent)}%
            </Text>
          ))}
          {measured.usd !== null && <Text dimColor> · US$ {measured.usd.toFixed(2)}</Text>}
        </Text>
      </Box>
    )
  })
}
