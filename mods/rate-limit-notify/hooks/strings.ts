const en = {
  title: 'Claude Code',
  locale: 'en-US',
  warn: (kind: string, percent: number, resets: string) =>
    resets === '' ? `${kind} limit at ${percent}%.` : `${kind} limit at ${percent}%. Resets ${resets}.`,
}

type Strings = typeof en

const pt: Strings = {
  title: 'Claude Code',
  locale: 'pt-BR',
  warn: (kind, percent, resets) =>
    resets === '' ? `Limite ${kind} em ${percent}%.` : `Limite ${kind} em ${percent}%. Renova ${resets}.`,
}

const es: Strings = {
  title: 'Claude Code',
  locale: 'es-ES',
  warn: (kind, percent, resets) =>
    resets === '' ? `Límite ${kind} al ${percent}%.` : `Límite ${kind} al ${percent}%. Se renueva ${resets}.`,
}

export const STRINGS = { en, pt, es }
