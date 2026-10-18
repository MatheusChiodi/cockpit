const en = {
  command: 'Lists the model each subagent of this session resolved to',
  none: 'No subagent spawned in this session.',
  line: (what: string, model: string) => `${model}  ${what}`,
  toast: (what: string, model: string, parent: string) => `Subagent "${what}" runs on ${model} (main: ${parent})`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Lista o modelo que cada subagente desta sessão usou',
  none: 'Nenhum subagente iniciado nesta sessão.',
  line: (what, model) => `${model}  ${what}`,
  toast: (what, model, parent) => `Subagente "${what}" roda em ${model} (principal: ${parent})`,
}

const es: Strings = {
  command: 'Lista el modelo que usó cada subagente de esta sesión',
  none: 'Ningún subagente iniciado en esta sesión.',
  line: (what, model) => `${model}  ${what}`,
  toast: (what, model, parent) => `Subagente "${what}" corre en ${model} (principal: ${parent})`,
}

export const STRINGS = { en, pt, es }
