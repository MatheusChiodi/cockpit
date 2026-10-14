const en = {
  long: (name: string, lines: number) => `${name} is now ${lines} lines: consider splitting it`,
}

type Strings = typeof en

const pt: Strings = {
  long: (name, lines) => `${name} agora tem ${lines} linhas: considere dividi-lo`,
}

const es: Strings = {
  long: (name, lines) => `${name} ahora tiene ${lines} líneas: considera dividirlo`,
}

export const STRINGS = { en, pt, es }
