const en = {
  command: 'Open the pane with the prompts you typed this session; press one to put it back in the prompt box',
  opened: 'Prompts pane opened.',
  title: 'prompts',
  paneTitle: 'Prompts',
  summary: (count: number) => `${count} typed  press a row to reuse it`,
  empty: 'No prompt yet. This pane fills up as you send prompts; press a row to put it back in the box.',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Abre o painel com os prompts digitados nesta sessão; pressione um para recolocá-lo na caixa de prompt',
  opened: 'Painel de prompts aberto.',
  title: 'prompts',
  paneTitle: 'Prompts',
  summary: count => `${count} digitados  pressione uma linha para reutilizar`,
  empty: 'Nenhum prompt ainda. O painel se preenche ao enviar prompts; pressione uma linha para colocá-la na caixa.',
}

const es: Strings = {
  command: 'Abre el panel con los prompts escritos en esta sesión; pulsa uno para volver a ponerlo en la caja de prompt',
  opened: 'Panel de prompts abierto.',
  title: 'prompts',
  paneTitle: 'Prompts',
  summary: count => `${count} escritos  pulsa una fila para reutilizarla`,
  empty: 'Aún no hay prompts. El panel se llena al enviar prompts; pulsa una fila para ponerla en la caja.',
}

export const STRINGS = { en, pt, es }
