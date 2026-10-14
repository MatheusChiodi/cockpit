const en = {
  nudge: (count: number) => `${count} reads and searches this turn: a subagent could explore this cheaper`,
}

type Strings = typeof en

const pt: Strings = {
  nudge: count => `${count} leituras e buscas neste turno: um subagente exploraria isso por menos`,
}

const es: Strings = {
  nudge: count => `${count} lecturas y búsquedas en este turno: un subagente exploraría esto por menos`,
}

export const STRINGS = { en, pt, es }
