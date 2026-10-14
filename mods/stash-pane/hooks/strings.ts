const en = {
  command: 'Open the pane with the stash list: index, branch, message and age',
  opened: 'Stashes pane opened.',
  title: 'stashes',
  refresh: 'Refresh',
  notRepo: 'Not a git repository.',
  notLoaded: 'Loading…',
  none: 'No stashes.',
  summary: (count: number) => `${count} saved`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Abre o painel com a lista de stashes: índice, branch, mensagem e idade',
  opened: 'Painel de stashes aberto.',
  title: 'stashes',
  refresh: 'Atualizar',
  notRepo: 'Não é um repositório git.',
  notLoaded: 'Carregando…',
  none: 'Nenhum stash.',
  summary: count => `${count} guardados`,
}

const es: Strings = {
  command: 'Abre el panel con la lista de stashes: índice, rama, mensaje y edad',
  opened: 'Panel de stashes abierto.',
  title: 'stashes',
  refresh: 'Actualizar',
  notRepo: 'No es un repositorio git.',
  notLoaded: 'Cargando…',
  none: 'Ningún stash.',
  summary: count => `${count} guardados`,
}

export const STRINGS = { en, pt, es }
