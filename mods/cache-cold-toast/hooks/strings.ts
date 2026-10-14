const en = {
  locale: 'en-US',
  cold: (minutes: number, tokens: string) =>
    `Prompt cache expired after ${minutes} min idle: this turn re-reads about ${tokens} tokens`,
}

type Strings = typeof en

const pt: Strings = {
  locale: 'pt-BR',
  cold: (minutes, tokens) =>
    `Cache de prompt expirou após ${minutes} min parado: este turno relê cerca de ${tokens} tokens`,
}

const es: Strings = {
  locale: 'es-ES',
  cold: (minutes, tokens) =>
    `El caché de prompt expiró tras ${minutes} min inactivo: este turno relee unos ${tokens} tokens`,
}

export const STRINGS = { en, pt, es }
