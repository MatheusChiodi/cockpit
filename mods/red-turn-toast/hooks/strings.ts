const en = {
  failing: (command: string) => `Turn over with failing tests: ${command}`,
}

type Strings = typeof en

const pt: Strings = {
  failing: command => `Turno terminou com testes falhando: ${command}`,
}

const es: Strings = {
  failing: command => `El turno terminó con tests fallando: ${command}`,
}

export const STRINGS = { en, pt, es }
