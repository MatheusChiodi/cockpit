import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row, meter, toneOf } from './kit'

import type { Usage } from '../types'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('usage-band')

const usage = atom({ plugin: 'usage-band', key: 'usage' } as const, null)

const LABEL: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: 'gasto' }

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

    const ui = $.ui.resolve(e)
    const { Text } = ui

    return row(
      ui,
      'sessao',
      'contexto',
      <Text wrap="truncate-end">
        {meter(ui, measured.percent, 14)} <Text color={toneOf(measured.percent)}>{measured.percent}%</Text>
        {measured.limits.map(limit => (
          <Text>
            <Text dimColor>
              {'   '}
              {(LABEL[limit.kind] ?? limit.kind).toUpperCase()}{' '}
            </Text>
            {meter(ui, limit.percent, 6)} <Text color={toneOf(limit.percent)}>{Math.round(limit.percent)}%</Text>
          </Text>
        ))}
        {measured.usd !== null && <Text dimColor>   US$ {measured.usd.toFixed(2)}</Text>}
      </Text>,
      below,
    )
  })
}
