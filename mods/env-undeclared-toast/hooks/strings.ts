const en = {
  undeclared: (names: string, file: string) => `env: ${names} missing from ${file}`,
}

type Strings = typeof en

const pt: Strings = {
  undeclared: (names, file) => `env: ${names} sem declaração em ${file}`,
}

const es: Strings = {
  undeclared: (names, file) => `env: ${names} sin declarar en ${file}`,
}

export const STRINGS = { en, pt, es }
