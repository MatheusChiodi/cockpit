import type { Register } from 'claude-code'

const elapsed = (ms: number): string => {
  const minutes = Math.max(0, Math.floor(ms / 60000))

  return minutes >= 60 ? `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}` : `${minutes}min`
}

export const register: Register = on => {
  let tools = 0
  let failures = 0
  let outputTokens = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'stats',
      description: 'Resumo da sessão: tempo, prompts, tools, tokens, contexto e custo',
    })

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    tools += 1

    if (ran.deny !== undefined || ran.isError === true) {
      failures += 1
    }

    return ran
  })

  on('turn.complete', ($, e, next) => {
    outputTokens += e.usage?.output_tokens ?? 0

    return next(e)
  })

  on('command.run', { command: 'stats' }, async $ => {
    const [usage, now, turns, model, cwd] = await Promise.all([
      $.session.usage(),
      $.clock.now(),
      $.session.turns(),
      $.session.model(),
      $.session.cwd(),
    ])
    const { context, cost } = usage

    return {
      text: [
        `Sessão      ${elapsed(now - usage.startedAt)} em ${cwd}`,
        `Modelo      ${model}`,
        `Prompts     ${turns}`,
        `Tools       ${tools} (${failures} com erro ou bloqueadas)`,
        `Saída       ${outputTokens.toLocaleString('pt-BR')} tokens`,
        `Contexto    ${context.percent ?? 0}% de ${context.window.toLocaleString('pt-BR')} tokens`,
        `Custo       ${cost === undefined ? 'n/d' : `US$ ${cost.usd.toFixed(2)}`}`,
      ].join('\n'),
    }
  })
}
