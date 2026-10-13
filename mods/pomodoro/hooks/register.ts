import type { EngineInterface, Register, Timer } from 'claude-code'

const DEFAULT_MINUTES = 25

// Estado do módulo: um reload cancela o timer junto com o ambiente antigo.
const running: { ticker: Timer | undefined; endsAt: number } = { ticker: undefined, endsAt: 0 }

const stop = ($: EngineInterface): void => {
  running.ticker?.cancel()
  running.ticker = undefined
  $.ui.status(undefined)
}

const tick = async ($: EngineInterface): Promise<void> => {
  const left = running.endsAt - (await $.clock.now())

  if (left > 0) {
    $.ui.status(`🍅 ${Math.ceil(left / 60000)} min`)

    return
  }

  stop($)
  $.ui.toast('Pomodoro concluído. Hora da pausa.', { timeoutMs: 15000 })
  await $.ui.notify('Pomodoro concluído. Hora da pausa.', { title: 'Pomodoro' }).catch(() => undefined)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'pomodoro',
      description: 'Inicia um pomodoro com contagem na status line; /pomodoro stop cancela',
      argumentHint: '[minutos|stop]',
    })

    return next(e)
  })

  on('command.run', { command: 'pomodoro' }, async ($, e) => {
    const wanted = e.args.trim().toLowerCase()

    if (wanted === 'stop') {
      stop($)

      return { text: 'Pomodoro cancelado.' }
    }

    const minutes = wanted === '' ? DEFAULT_MINUTES : Number(wanted)

    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 240) {
      return { text: 'Uso: /pomodoro [minutos de 1 a 240 | stop]' }
    }

    stop($)
    running.endsAt = (await $.clock.now()) + minutes * 60000
    running.ticker = $.clock.every(15000, () => void tick($))
    await tick($)

    return { text: `Pomodoro de ${minutes} min iniciado.` }
  })
}
