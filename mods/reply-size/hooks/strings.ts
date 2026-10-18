const en = {
  words: (count: number) => `${count} words`,
  code: (count: number) => (count === 1 ? '1 code block' : `${count} code blocks`),
}

type Strings = typeof en

const pt: Strings = {
  words: count => `${count} palavras`,
  code: count => (count === 1 ? '1 bloco de código' : `${count} blocos de código`),
}

const es: Strings = {
  words: count => `${count} palabras`,
  code: count => (count === 1 ? '1 bloque de código' : `${count} bloques de código`),
}

export const STRINGS = { en, pt, es }
