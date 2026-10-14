const en = {
  title: 'Claude Code',
  done: (agent: string, took: string) => `Subagent ${agent} finished in ${took}.`,
}

type Strings = typeof en

const pt: Strings = {
  title: 'Claude Code',
  done: (agent, took) => `O subagente ${agent} terminou em ${took}.`,
}

const es: Strings = {
  title: 'Claude Code',
  done: (agent, took) => `El subagente ${agent} terminó en ${took}.`,
}

export const STRINGS = { en, pt, es }
