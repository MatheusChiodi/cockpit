const en = {
  denied: (tool: string, reason: string) => `${tool} refused: ${reason}`,
  noReason: 'no reason given',
}

type Strings = typeof en

const pt: Strings = {
  denied: (tool, reason) => `${tool} recusada: ${reason}`,
  noReason: 'sem motivo informado',
}

const es: Strings = {
  denied: (tool, reason) => `${tool} rechazada: ${reason}`,
  noReason: 'sin motivo indicado',
}

export const STRINGS = { en, pt, es }
