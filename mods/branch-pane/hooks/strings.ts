const en = {
  command: 'Open the pane with the local branches, ahead and behind and the age of each',
  opened: 'Branches pane opened.',
  title: 'branches',
  refresh: 'Refresh',
  notRepo: 'Not a git repository.',
  notLoaded: 'Loading…',
  none: 'No local branches.',
  noUpstream: 'no upstream',
  gone: 'upstream gone',
  summary: (count: number) => `${count} local`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Abre o painel com as branches locais, à frente e atrás e a idade de cada uma',
  opened: 'Painel de branches aberto.',
  title: 'branches',
  refresh: 'Atualizar',
  notRepo: 'Não é um repositório git.',
  notLoaded: 'Carregando…',
  none: 'Nenhuma branch local.',
  noUpstream: 'sem upstream',
  gone: 'upstream removido',
  summary: count => `${count} locais`,
}

const es: Strings = {
  command: 'Abre el panel con las ramas locales, adelantadas y atrasadas y la edad de cada una',
  opened: 'Panel de ramas abierto.',
  title: 'ramas',
  refresh: 'Actualizar',
  notRepo: 'No es un repositorio git.',
  notLoaded: 'Cargando…',
  none: 'Ninguna rama local.',
  noUpstream: 'sin upstream',
  gone: 'upstream eliminado',
  summary: count => `${count} locales`,
}

export const STRINGS = { en, pt, es }
