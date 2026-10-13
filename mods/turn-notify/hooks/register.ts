import type { Register } from 'claude-code'

const MIN_SECONDS = 30

export const register: Register = on => {
  on('turn.complete', async ($, e, next) => {
    const seconds = Math.round(e.durationMs / 1000)

    // Só turnos longos do loop principal: é quando você já trocou de janela.
    if (e.agentId === undefined && !e.isAborted && seconds >= MIN_SECONDS) {
      const text = e.reason === 'error' ? `Turno terminou com erro após ${seconds}s.` : `Turno concluído em ${seconds}s.`
      await $.ui.notify(text, { title: 'Claude Code' }).catch(() => undefined)
    }

    return next(e)
  })
}
