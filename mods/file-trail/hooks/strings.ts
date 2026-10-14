const en = {
  command: 'Open the pane with the files read and changed in this session',
  title: 'Files',
  opened: 'Files pane opened.',
  label: 'files',
  summary: (touched: number, changed: number) => `${touched} touched · ${changed} changed`,
  empty: 'No file touched yet.',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Abre o painel com os arquivos lidos e alterados nesta sessão',
  title: 'Arquivos',
  opened: 'Painel de arquivos aberto.',
  label: 'arquivos',
  summary: (touched, changed) => `${touched} tocados · ${changed} alterados`,
  empty: 'Nenhum arquivo tocado ainda.',
}

const es: Strings = {
  command: 'Abre el panel con los archivos leídos y modificados en esta sesión',
  title: 'Archivos',
  opened: 'Panel de archivos abierto.',
  label: 'archivos',
  summary: (touched, changed) => `${touched} tocados · ${changed} modificados`,
  empty: 'Ningún archivo tocado todavía.',
}

export const STRINGS = { en, pt, es }
