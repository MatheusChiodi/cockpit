import type { Register } from 'claude-code'

const MIN_LENGTH = 1800

export const register: Register = on => {
  on('turn.complete', async ($, e, next) => {
    const answered = await next(e)

    // Só respostas longas do loop principal; uma chamada barata ao haiku por resumo.
    if (e.agentId !== undefined || e.reason !== 'answer' || e.answer.length < MIN_LENGTH) {
      return answered
    }

    const summary = await $.model.complete({
      model: 'haiku',
      system: 'Você resume respostas técnicas em português do Brasil. Devolva só o resumo, em no máximo 2 frases, sem prefixo.',
      prompt: e.answer.slice(0, 20000),
      maxTokens: 160,
      timeoutMs: 15000,
    })

    return summary.isAnswered ? { ...answered, text: `TL;DR: ${summary.text.trim()}` } : answered
  })
}
