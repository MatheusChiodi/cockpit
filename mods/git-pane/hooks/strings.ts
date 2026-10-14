const en = {
  command: 'Open the pane with the branch, the changed files and the last commits',
  opened: 'Repo pane opened.',
  title: 'repo',
  refresh: 'Refresh',
  notRepo: 'Not a git repository.',
  notLoaded: 'Loading…',
  clean: 'Working tree clean.',
  noCommits: 'No commits yet.',
  summary: (branch: string, ahead: number, behind: number, changed: number) =>
    `⎇ ${branch}  ↑${ahead} ↓${behind}  ${changed} changed`,
  commits: 'last commits',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Abre o painel com a branch, os arquivos alterados e os últimos commits',
  opened: 'Painel do repositório aberto.',
  title: 'repo',
  refresh: 'Atualizar',
  notRepo: 'Não é um repositório git.',
  notLoaded: 'Carregando…',
  clean: 'Árvore de trabalho limpa.',
  noCommits: 'Ainda sem commits.',
  summary: (branch, ahead, behind, changed) => `⎇ ${branch}  ↑${ahead} ↓${behind}  ${changed} alterados`,
  commits: 'últimos commits',
}

const es: Strings = {
  command: 'Abre el panel con la rama, los archivos cambiados y los últimos commits',
  opened: 'Panel del repositorio abierto.',
  title: 'repo',
  refresh: 'Actualizar',
  notRepo: 'No es un repositorio git.',
  notLoaded: 'Cargando…',
  clean: 'Árbol de trabajo limpio.',
  noCommits: 'Aún sin commits.',
  summary: (branch, ahead, behind, changed) => `⎇ ${branch}  ↑${ahead} ↓${behind}  ${changed} cambiados`,
  commits: 'últimos commits',
}

export const STRINGS = { en, pt, es }
