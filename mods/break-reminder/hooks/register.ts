import type { Register } from 'claude-code'

const EVERY_MINUTES = 50

const TIPS = [
  'Levante, alongue e beba água.',
  'Olhe para longe por 20 segundos: regra 20-20-20.',
  'Uma volta rápida ajuda mais que mais um prompt.',
  'Ombros para baixo, respire fundo três vezes.',
]

export const register: Register = on => {
  on('session.start', ($, e, next) => {
    let rounds = 0

    // O timer morre sozinho num reload do módulo.
    $.clock.every(EVERY_MINUTES * 60000, () => {
      rounds += 1
      $.ui.toast(`${rounds * EVERY_MINUTES} min de sessão. ${TIPS[rounds % TIPS.length] ?? ''}`, {
        timeoutMs: 20000,
      })
    })

    return next(e)
  })
}
