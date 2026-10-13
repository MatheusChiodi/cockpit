import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row, meter, toneOf } from './kit'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('compact-nudge')

const percent = atom({ plugin: 'compact-nudge', key: 'percent' } as const, 0)

const THRESHOLD = 75

const compact = async ($: EngineInterface): Promise<void> => {
  // Rejeita enquanto um turno roda: aí é só tentar de novo depois.
  const done = await $.session.compact({}).catch(() => undefined)

  $.ui.toast(done === undefined ? 'Não deu para compactar agora (turno em andamento?).' : 'Conversa compactada.')
}

export const register: Register = on => {
  on('session.measure', async ($, e, next) => {
    const now = e.context.percent ?? 0
    await update($, percent, held => (held === now ? held : now))

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const used = await read($, percent)

    if (e.props.hasSurvey || (await isOff($)) || used < THRESHOLD) {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Button, Text } = ui

    return row(
      ui,
      'sessao',
      'compactar',
      [
        <Text>
          {meter(ui, used, 14)} <Text color={toneOf(used)}>{used}%</Text>
          <Text dimColor>  contexto quase cheio  </Text>
        </Text>,
        <Button key="compact" label="Compactar agora" variant="primary" onPress={() => compact($)} />,
      ],
      below,
    )
  })
}
