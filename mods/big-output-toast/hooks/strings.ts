const en = {
  big: (tool: string, size: string) => `${tool} returned ${size} characters: that eats the context`,
  locale: 'en-US',
}

type Strings = typeof en

const pt: Strings = {
  big: (tool, size) => `${tool} devolveu ${size} caracteres: isso consome o contexto`,
  locale: 'pt-BR',
}

const es: Strings = {
  big: (tool, size) => `${tool} devolvió ${size} caracteres: eso consume el contexto`,
  locale: 'es-ES',
}

export const STRINGS = { en, pt, es }
