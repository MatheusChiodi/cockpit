const en = {
  failed: (count: number) => `${count} failed`,
}

type Strings = typeof en

const pt: Strings = {
  failed: count => (count === 1 ? '1 falhou' : `${count} falharam`),
}

const es: Strings = {
  failed: count => (count === 1 ? '1 falló' : `${count} fallaron`),
}

export const STRINGS = { en, pt, es }
