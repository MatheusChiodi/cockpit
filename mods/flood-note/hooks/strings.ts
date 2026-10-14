const en = {
  locale: 'en-US',
  told: (tool: string, lines: string) => `flood-note: ${tool} returned ${lines} lines, Claude was told to narrow the next one`,
}

type Strings = typeof en

const pt: Strings = {
  locale: 'pt-BR',
  told: (tool, lines) => `flood-note: ${tool} devolveu ${lines} linhas, Claude foi avisado para estreitar a próxima`,
}

const es: Strings = {
  locale: 'es-ES',
  told: (tool, lines) => `flood-note: ${tool} devolvió ${lines} líneas, se avisó a Claude que acote la siguiente`,
}

export const STRINGS = { en, pt, es }
