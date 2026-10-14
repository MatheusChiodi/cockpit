const en = {
  command: 'Open the pane with every tool call that failed or was denied, with its error',
  opened: 'Errors pane opened.',
  title: 'errors',
  paneTitle: 'Errors',
  summary: (count: number) => `${count} failed or denied`,
  empty: 'No failed tool call yet. This pane fills up when a tool fails or is denied.',
  unknown: 'no message',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Abre o painel com cada chamada de ferramenta que falhou ou foi negada, com o erro',
  opened: 'Painel de erros aberto.',
  title: 'erros',
  paneTitle: 'Erros',
  summary: count => `${count} com falha ou negadas`,
  empty: 'Nenhuma chamada falhou ainda. O painel se preenche quando uma ferramenta falha ou é negada.',
  unknown: 'sem mensagem',
}

const es: Strings = {
  command: 'Abre el panel con cada llamada de herramienta que falló o fue denegada, con su error',
  opened: 'Panel de errores abierto.',
  title: 'errores',
  paneTitle: 'Errores',
  summary: count => `${count} con fallo o denegadas`,
  empty: 'Ninguna llamada ha fallado aún. El panel se llena cuando una herramienta falla o es denegada.',
  unknown: 'sin mensaje',
}

export const STRINGS = { en, pt, es }
