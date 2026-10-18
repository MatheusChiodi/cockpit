const en = {
  locale: 'en-US',
  tests: (count: number) => `${count} tests`,
  failed: (count: number) => `${count} failed`,
}

type Strings = typeof en

const pt: Strings = {
  locale: 'pt-BR',
  tests: count => `${count} testes`,
  failed: count => `${count} ${count === 1 ? 'falha' : 'falhas'}`,
}

const es: Strings = {
  locale: 'es-ES',
  tests: count => `${count} tests`,
  failed: count => `${count} ${count === 1 ? 'fallo' : 'fallos'}`,
}

export const STRINGS = { en, pt, es }
