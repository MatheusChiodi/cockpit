const en = {
  wandering: (prompts: number) => `${prompts} prompts and no file changed. What would make this done?`,
}

type Strings = typeof en

const pt: Strings = {
  wandering: prompts => `${prompts} prompts e nenhum arquivo alterado. O que deixaria isto pronto?`,
}

const es: Strings = {
  wandering: prompts => `${prompts} prompts y ningún archivo cambiado. ¿Qué lo dejaría terminado?`,
}

export const STRINGS = { en, pt, es }
