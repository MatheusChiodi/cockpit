const en = {
  background: 'to run in background',
}

type Strings = typeof en

const pt: Strings = {
  background: 'para rodar em segundo plano',
}

const es: Strings = {
  background: 'para ejecutar en segundo plano',
}

export const STRINGS = { en, pt, es }
