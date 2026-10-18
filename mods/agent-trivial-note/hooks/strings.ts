const en = {
  toast: (what: string) => `Subagent "${what}" looks like one tool call: a spawn costs a fresh context and a full report`,
}

type Strings = typeof en

const pt: Strings = {
  toast: what => `Subagente "${what}" parece uma só chamada de ferramenta: iniciar um custa um contexto novo e um relatório completo`,
}

const es: Strings = {
  toast: what => `El subagente "${what}" parece una sola llamada de herramienta: iniciar uno cuesta un contexto nuevo y un informe completo`,
}

export const STRINGS = { en, pt, es }
