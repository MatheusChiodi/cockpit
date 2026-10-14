const en = {
  title: 'Claude Code',
  ok: (took: string, command: string) => `Command finished after ${took}: ${command}`,
  failed: (took: string, command: string) => `Command failed after ${took}: ${command}`,
}

type Strings = typeof en

const pt: Strings = {
  title: 'Claude Code',
  ok: (took, command) => `Comando terminou após ${took}: ${command}`,
  failed: (took, command) => `Comando falhou após ${took}: ${command}`,
}

const es: Strings = {
  title: 'Claude Code',
  ok: (took, command) => `El comando terminó tras ${took}: ${command}`,
  failed: (took, command) => `El comando falló tras ${took}: ${command}`,
}

export const STRINGS = { en, pt, es }
