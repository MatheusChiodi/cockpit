const en = {
  command: 'Open the pane with the URLs in Claude answers this session; press one to copy it',
  opened: 'Links pane opened.',
  title: 'links',
  paneTitle: 'Links',
  summary: (count: number) => `${count} urls  press a row to copy it`,
  empty: 'No URL yet. This pane collects the links Claude writes in its answers; press one to copy it.',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Abre o painel com as URLs das respostas de Claude nesta sessão; pressione uma para copiá-la',
  opened: 'Painel de links aberto.',
  title: 'links',
  paneTitle: 'Links',
  summary: count => `${count} urls  pressione uma linha para copiar`,
  empty: 'Nenhuma URL ainda. O painel reúne os links que Claude escreve nas respostas; pressione um para copiá-lo.',
}

const es: Strings = {
  command: 'Abre el panel con las URLs de las respuestas de Claude en esta sesión; pulsa una para copiarla',
  opened: 'Panel de enlaces abierto.',
  title: 'enlaces',
  paneTitle: 'Enlaces',
  summary: count => `${count} urls  pulsa una fila para copiar`,
  empty: 'Aún no hay URLs. El panel reúne los enlaces que Claude escribe en sus respuestas; pulsa uno para copiarlo.',
}

export const STRINGS = { en, pt, es }
