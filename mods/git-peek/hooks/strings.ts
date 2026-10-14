const en = {
  statusCommand: 'Short git status, no turn spent',
  logCommand: 'Latest commits (git log --oneline)',
  diffCommand: 'Summary of the current diff (git diff --stat)',
  noGit: 'git not found or not responding.',
  noOutput: '(no output)',
}

type Strings = typeof en

const pt: Strings = {
  statusCommand: 'git status resumido, sem gastar turno',
  logCommand: 'Últimos commits (git log --oneline)',
  diffCommand: 'Resumo do diff atual (git diff --stat)',
  noGit: 'git não encontrado ou sem resposta.',
  noOutput: '(sem saída)',
}

const es: Strings = {
  statusCommand: 'git status resumido, sin gastar turno',
  logCommand: 'Últimos commits (git log --oneline)',
  diffCommand: 'Resumen del diff actual (git diff --stat)',
  noGit: 'git no encontrado o sin respuesta.',
  noOutput: '(sin salida)',
}

export const STRINGS = { en, pt, es }
