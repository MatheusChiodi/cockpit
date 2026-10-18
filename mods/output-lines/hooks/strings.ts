const en = {
  lines: (count: number) => `${count} lines`,
}

type Strings = typeof en

const pt: Strings = {
  lines: count => `${count} linhas`,
}

const es: Strings = {
  lines: count => `${count} líneas`,
}

export const STRINGS = { en, pt, es }
