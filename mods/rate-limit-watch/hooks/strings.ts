const en = {
  locale: 'en-US',
  command: 'Show the usage of the account rate limit windows',
  windows: {
    five_hour: '5h window',
    seven_day: '7-day window',
    spend_limit: 'spend limit',
  } as Record<string, string>,
  resets: (when: string) => ` (resets ${when})`,
  toast: (window: string, percent: number, resets: string) => `Rate limit: ${window} at ${percent}%${resets}`,
  none: 'No rate limit reading (outside a subscription or before the first reply).',
}

type Strings = typeof en

const pt: Strings = {
  locale: 'pt-BR',
  command: 'Mostra o uso das janelas de rate limit da conta',
  windows: {
    five_hour: 'janela de 5h',
    seven_day: 'janela de 7 dias',
    spend_limit: 'limite de gasto',
  },
  resets: when => ` (reseta ${when})`,
  toast: (window, percent, resets) => `Rate limit: ${window} em ${percent}%${resets}`,
  none: 'Sem leitura de rate limit (fora de assinatura ou antes da primeira resposta).',
}

const es: Strings = {
  locale: 'es-ES',
  command: 'Muestra el uso de las ventanas de rate limit de la cuenta',
  windows: {
    five_hour: 'ventana de 5h',
    seven_day: 'ventana de 7 días',
    spend_limit: 'límite de gasto',
  },
  resets: when => ` (se restablece ${when})`,
  toast: (window, percent, resets) => `Rate limit: ${window} al ${percent}%${resets}`,
  none: 'Sin lectura de rate limit (fuera de una suscripción o antes de la primera respuesta).',
}

export const STRINGS = { en, pt, es }
