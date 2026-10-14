const en = {
  stuck: (what: string, tries: number) => `${tries} failed attempts at "${what}". Step back and look at the cause.`,
}

type Strings = typeof en

const pt: Strings = {
  stuck: (what, tries) => `${tries} tentativas falhas de "${what}". Dê um passo atrás e olhe a causa.`,
}

const es: Strings = {
  stuck: (what, tries) => `${tries} intentos fallidos de "${what}". Da un paso atrás y mira la causa.`,
}

export const STRINGS = { en, pt, es }
