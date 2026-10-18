const en = {
  done: (what: string, total: string, output: string, model: string) => `Subagent "${what}" done: ${total} tokens (${output} out) on ${model}`,
}

type Strings = typeof en

const pt: Strings = {
  done: (what, total, output, model) => `Subagente "${what}" terminou: ${total} tokens (${output} de saída) em ${model}`,
}

const es: Strings = {
  done: (what, total, output, model) => `Subagente "${what}" terminó: ${total} tokens (${output} de salida) en ${model}`,
}

export const STRINGS = { en, pt, es }
