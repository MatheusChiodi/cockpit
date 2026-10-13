import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('shield-band')

const blocks = atom({ plugin: 'shield-band', key: 'blocks' } as const, { count: 0, last: '' })

export const register: Register = on => {
  // Conta as chamadas que um guard (ou uma regra de permissão) recusou nesta sessão.
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny !== undefined) {
      const reason = `${String(e.tool)}: ${ran.deny.replace(/\s+/g, ' ').slice(0, 90)}`
      await update($, blocks, held => ({ count: held.count + 1, last: reason }))
    }

    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const held = await read($, blocks)

    if (e.props.hasSurvey || (await isOff($)) || held.count === 0) {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Text } = ui

    return row(
      ui,
      'sessao',
      'guards',
      <Text wrap="truncate-end">
        <Text color="permission" bold>
          {held.count} bloqueio{held.count === 1 ? '' : 's'}
        </Text>
        <Text dimColor>  {held.last}</Text>
      </Text>,
      below,
    )
  })
}
