const en = {
  locale: 'en-GB',
  command: 'Open a chronological log of the session: prompts, tool calls, failures and turn ends',
  opened: 'Timeline opened.',
  title: 'timeline',
  paneTitle: 'Timeline',
  summary: (count: number) => `${count} events`,
  empty: 'Nothing happened yet. This log fills up with prompts, tool calls, failures and turn ends, newest at the bottom.',
  turnEnded: (seconds: string, reason: string) => `turn ${reason}  ${seconds}s`,
  reasons: { answer: 'ended', aborted: 'aborted', refusal: 'refused', error: 'failed' } as Record<string, string>,
}

type Strings = typeof en

const pt: Strings = {
  locale: 'pt-BR',
  command: 'Abre um registro cronológico da sessão: prompts, chamadas de ferramenta, falhas e fins de turno',
  opened: 'Linha do tempo aberta.',
  title: 'linha do tempo',
  paneTitle: 'Linha do tempo',
  summary: count => `${count} eventos`,
  empty: 'Nada aconteceu ainda. O registro se preenche com prompts, chamadas de ferramenta, falhas e fins de turno, o mais novo embaixo.',
  turnEnded: (seconds, reason) => `turno ${reason}  ${seconds}s`,
  reasons: { answer: 'concluído', aborted: 'interrompido', refusal: 'recusado', error: 'com erro' },
}

const es: Strings = {
  locale: 'es-ES',
  command: 'Abre un registro cronológico de la sesión: prompts, llamadas de herramienta, fallos y fines de turno',
  opened: 'Línea de tiempo abierta.',
  title: 'línea de tiempo',
  paneTitle: 'Línea de tiempo',
  summary: count => `${count} eventos`,
  empty: 'Aún no ha pasado nada. El registro se llena con prompts, llamadas de herramienta, fallos y fines de turno, el más nuevo abajo.',
  turnEnded: (seconds, reason) => `turno ${reason}  ${seconds}s`,
  reasons: { answer: 'terminado', aborted: 'interrumpido', refusal: 'rechazado', error: 'con error' },
}

export const STRINGS = { en, pt, es }
