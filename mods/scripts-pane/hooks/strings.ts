const en = {
  command: 'Open the pane with the scripts of package.json; press one to ask Claude to run it',
  opened: 'Scripts pane opened.',
  title: 'scripts',
  refresh: 'Refresh',
  notLoaded: 'Loading…',
  notFound: 'No readable package.json here.',
  none: 'package.json has no scripts.',
  summary: (count: number) => `${count} in package.json`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Abre o painel com os scripts do package.json; aperte um para pedir ao Claude que o rode',
  opened: 'Painel de scripts aberto.',
  title: 'scripts',
  refresh: 'Atualizar',
  notLoaded: 'Carregando…',
  notFound: 'Nenhum package.json legível aqui.',
  none: 'O package.json não tem scripts.',
  summary: count => `${count} no package.json`,
}

const es: Strings = {
  command: 'Abre el panel con los scripts de package.json; pulsa uno para pedir a Claude que lo ejecute',
  opened: 'Panel de scripts abierto.',
  title: 'scripts',
  refresh: 'Actualizar',
  notLoaded: 'Cargando…',
  notFound: 'No hay un package.json legible aquí.',
  none: 'El package.json no tiene scripts.',
  summary: count => `${count} en package.json`,
}

export const STRINGS = { en, pt, es }
