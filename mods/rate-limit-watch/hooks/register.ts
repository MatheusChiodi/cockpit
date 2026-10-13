import type { Register, SessionRateLimit } from 'claude-code'

const STEPS = [95, 90, 75] as const
const LABEL: Record<string, string> = {
  five_hour: 'janela de 5h',
  seven_day: 'janela de 7 dias',
  spend_limit: 'limite de gasto',
}

const label = (kind: string): string => LABEL[kind] ?? kind

const resets = (limit: SessionRateLimit): string =>
  limit.resetsAt === undefined
    ? ''
    : ` (reseta ${new Date(limit.resetsAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })})`

export const register: Register = on => {
  const warned = new Map<string, number>()

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'limits',
      description: 'Mostra o uso das janelas de rate limit da conta',
    })

    return next(e)
  })

  on('command.run', { command: 'limits' }, async $ => {
    const { rateLimits } = await $.session.usage()

    return {
      text:
        rateLimits.length === 0
          ? 'Sem leitura de rate limit (fora de assinatura ou antes da primeira resposta).'
          : rateLimits.map(limit => `${label(limit.kind)}: ${limit.percentUsed}%${resets(limit)}`).join('\n'),
    }
  })

  on('session.measure', ($, e, next) => {
    for (const limit of e.rateLimits) {
      const step = STEPS.find(threshold => limit.percentUsed >= threshold) ?? 0

      if (step > (warned.get(limit.kind) ?? 0)) {
        $.ui.toast(`Rate limit: ${label(limit.kind)} em ${limit.percentUsed}%${resets(limit)}`, {
          timeoutMs: 10000,
        })
      }

      warned.set(limit.kind, step)
    }

    return next(e)
  })
}
