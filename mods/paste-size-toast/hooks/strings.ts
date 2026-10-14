const en = {
  locale: 'en-US',
  big: (lines: string, tokens: string) => `Prompt is ${lines} lines, about ${tokens} tokens: trim the paste to the part that matters`,
}

type Strings = typeof en

const pt: Strings = {
  locale: 'pt-BR',
  big: (lines, tokens) => `O prompt tem ${lines} linhas, cerca de ${tokens} tokens: enxugue o que colou até o trecho que importa`,
}

const es: Strings = {
  locale: 'es-ES',
  big: (lines, tokens) => `El prompt tiene ${lines} líneas, unos ${tokens} tokens: recorta lo pegado a la parte que importa`,
}

export const STRINGS = { en, pt, es }
