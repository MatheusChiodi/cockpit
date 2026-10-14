const en = {
  title: 'Claude Code',
  question: 'Claude has a question for you.',
  permission: (tool: string) => `Claude needs your permission to run ${tool}.`,
}

type Strings = typeof en

const pt: Strings = {
  title: 'Claude Code',
  question: 'O Claude tem uma pergunta para você.',
  permission: tool => `O Claude precisa da sua permissão para usar ${tool}.`,
}

const es: Strings = {
  title: 'Claude Code',
  question: 'Claude tiene una pregunta para ti.',
  permission: tool => `Claude necesita tu permiso para usar ${tool}.`,
}

export const STRINGS = { en, pt, es }
