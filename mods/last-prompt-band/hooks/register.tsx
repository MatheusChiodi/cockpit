import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('last-prompt-band')

const last = atom({ plugin: 'last-prompt-band', key: 'last' } as const, '')

export const register: Register = on => {
  on('prompt.submit', async ($, e, next) => {
    const entered = await next(e)

    // Só o que você digitou: mensagens de agentes e notificações ficam de fora.
    if (entered.drop === undefined && e.origin.kind === 'composer') {
      const line = e.text.replace(/\s+/g, ' ').trim().slice(0, 140)
      await update($, last, () => line)
    }

    return entered
  })

  // Depois de uma resposta longa, o que foi pedido já rolou para fora da tela.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const text = await read($, last)

    if (e.props.hasSurvey || (await isOff($)) || text === '') {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Text } = ui

    return row(
      ui,
      'sessao',
      'pedido',
      <Text dimColor italic wrap="truncate-end">
        {text}
      </Text>,
      below,
    )
  })
}
