const en = {
  command: 'Open the pane with the outdated npm packages: current, wanted and latest',
  opened: 'Deps pane opened.',
  title: 'deps',
  refresh: 'Refresh',
  notLoaded: 'Loading…',
  failed: 'npm outdated failed: is there a package.json here?',
  none: 'Everything is up to date.',
  package: 'package',
  current: 'current',
  wanted: 'wanted',
  latest: 'latest',
  summary: (count: number, major: number) => `${count} outdated · ${major} major`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Abre o painel com os pacotes npm desatualizados: atual, desejada e última',
  opened: 'Painel de dependências aberto.',
  title: 'deps',
  refresh: 'Atualizar',
  notLoaded: 'Carregando…',
  failed: 'npm outdated falhou: existe um package.json aqui?',
  none: 'Tudo está atualizado.',
  package: 'pacote',
  current: 'atual',
  wanted: 'desejada',
  latest: 'última',
  summary: (count, major) => `${count} desatualizados · ${major} major`,
}

const es: Strings = {
  command: 'Abre el panel con los paquetes npm desactualizados: actual, deseada y última',
  opened: 'Panel de dependencias abierto.',
  title: 'deps',
  refresh: 'Actualizar',
  notLoaded: 'Cargando…',
  failed: 'npm outdated falló: ¿hay un package.json aquí?',
  none: 'Todo está actualizado.',
  package: 'paquete',
  current: 'actual',
  wanted: 'deseada',
  latest: 'última',
  summary: (count, major) => `${count} desactualizados · ${major} major`,
}

export const STRINGS = { en, pt, es }
