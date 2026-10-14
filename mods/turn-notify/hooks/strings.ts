const en = {
  title: 'Claude Code',
  done: (seconds: number) => `Turn finished in ${seconds}s.`,
  failed: (seconds: number) => `Turn ended with an error after ${seconds}s.`,
}

type Strings = typeof en

const pt: Strings = {
  title: 'Claude Code',
  done: seconds => `Turno concluído em ${seconds}s.`,
  failed: seconds => `Turno terminou com erro após ${seconds}s.`,
}

const es: Strings = {
  title: 'Claude Code',
  done: seconds => `Turno terminado en ${seconds}s.`,
  failed: seconds => `El turno terminó con error tras ${seconds}s.`,
}

export const STRINGS = { en, pt, es }
