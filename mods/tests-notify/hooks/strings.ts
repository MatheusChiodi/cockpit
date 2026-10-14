const en = {
  title: 'Claude Code',
  passed: (took: string, command: string) => `Tests passed after ${took}: ${command}`,
  failed: (took: string, command: string) => `Tests failed after ${took}: ${command}`,
}

type Strings = typeof en

const pt: Strings = {
  title: 'Claude Code',
  passed: (took, command) => `Testes passaram após ${took}: ${command}`,
  failed: (took, command) => `Testes falharam após ${took}: ${command}`,
}

const es: Strings = {
  title: 'Claude Code',
  passed: (took, command) => `Los tests pasaron tras ${took}: ${command}`,
  failed: (took, command) => `Los tests fallaron tras ${took}: ${command}`,
}

export const STRINGS = { en, pt, es }
