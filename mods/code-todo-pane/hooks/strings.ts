const en = {
  command: 'Open the pane with the TODO, FIXME and HACK lines in tracked files',
  opened: 'Code TODO pane opened.',
  title: 'code todo',
  refresh: 'Refresh',
  notRepo: 'Not a git repository.',
  notLoaded: 'Loading…',
  none: 'No TODO, FIXME or HACK in tracked files.',
  summary: (total: number, shown: number) => (total > shown ? `${total} found · first ${shown}` : `${total} found`),
}

type Strings = typeof en

const pt: Strings = {
  command: 'Abre o painel com as linhas TODO, FIXME e HACK dos arquivos rastreados',
  opened: 'Painel de TODOs do código aberto.',
  title: 'code todo',
  refresh: 'Atualizar',
  notRepo: 'Não é um repositório git.',
  notLoaded: 'Carregando…',
  none: 'Nenhum TODO, FIXME ou HACK nos arquivos rastreados.',
  summary: (total, shown) => (total > shown ? `${total} encontrados · primeiros ${shown}` : `${total} encontrados`),
}

const es: Strings = {
  command: 'Abre el panel con las líneas TODO, FIXME y HACK de los archivos rastreados',
  opened: 'Panel de TODOs del código abierto.',
  title: 'code todo',
  refresh: 'Actualizar',
  notRepo: 'No es un repositorio git.',
  notLoaded: 'Cargando…',
  none: 'Ningún TODO, FIXME o HACK en los archivos rastreados.',
  summary: (total, shown) => (total > shown ? `${total} encontrados · primeros ${shown}` : `${total} encontrados`),
}

export const STRINGS = { en, pt, es }
