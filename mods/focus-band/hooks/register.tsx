import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { Focus } from '../types'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('focus-band')

const focus = atom({ plugin: 'focus-band', key: 'focus' } as const, null)

const running: { ticker: Timer | undefined; endsAt: number; total: number } = { ticker: undefined, endsAt: 0, total: 0 }

const stop = async ($: EngineInterface): Promise<void> => {
  running.ticker?.cancel()
  running.ticker = undefined
  await update($, focus, () => null)
}

const tick = async ($: EngineInterface): Promise<void> => {
  const left = Math.ceil((running.endsAt - (await $.clock.now())) / 60000)

  if (left > 0) {
    const now: Focus = { left, total: running.total }
    await update($, focus, held => (held?.left === left ? held : now))

    return
  }

  await stop($)
  $.ui.toast('Bloco de foco concluído. Hora da pausa.', { timeoutMs: 15000 })
  await $.ui.notify('Bloco de foco concluído. Hora da pausa.', { title: 'Foco' }).catch(() => undefined)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'focus',
      description: 'Bloco de foco com barra de progresso fixa acima do prompt; /focus stop cancela',
      argumentHint: '[minutos|stop]',
    })

    return next(e)
  })

  on('command.run', { command: 'focus' }, async ($, e) => {
    const wanted = e.args.trim().toLowerCase()
    const minutes = wanted === '' ? 25 : Number(wanted)

    if (wanted === 'stop') {
      await stop($)

      return { text: 'Bloco de foco cancelado.' }
    }

    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 240) {
      return { text: 'Uso: /focus [minutos de 1 a 240 | stop]' }
    }

    await stop($)
    running.total = minutes
    running.endsAt = (await $.clock.now()) + minutes * 60000
    running.ticker = $.clock.every(15000, () => void tick($))
    await tick($)

    return { text: `Bloco de foco de ${minutes} min iniciado.` }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const now = await read($, focus)

    if (e.props.hasSurvey || (await isOff($)) || now === null) {
      return below
    }

    const { Box, Text } = $.ui.resolve(e)
    const filled = Math.round(((now.total - now.left) / now.total) * 20)

    return (
      <Box flexDirection="column">
        {below}
        <Text>
          <Text color="claude">◷ foco </Text>
          <Text color="claude">{'█'.repeat(filled)}</Text>
          <Text dimColor>{'░'.repeat(20 - filled)}</Text> {now.left} min restantes
        </Text>
      </Box>
    )
  })
}
