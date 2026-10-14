const en = {
  locale: 'en-GB',
  from: (name: string) => `from ${name}`,
}

type Strings = typeof en

const pt: Strings = {
  locale: 'pt-BR',
  from: name => `de ${name}`,
}

const es: Strings = {
  locale: 'es-ES',
  from: name => `de ${name}`,
}

export const STRINGS = { en, pt, es }
