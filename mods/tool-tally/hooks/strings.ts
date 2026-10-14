const en = {
  command: 'Open the pane with the call count per tool',
  title: 'Tools',
  opened: 'Tools pane opened.',
  label: 'tools',
  calls: (total: number) => `${total} calls`,
  empty: 'No tool used yet.',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Abre o painel com a contagem de chamadas por ferramenta',
  title: 'Ferramentas',
  opened: 'Painel de ferramentas aberto.',
  label: 'ferramentas',
  calls: total => `${total} chamadas`,
  empty: 'Nenhuma ferramenta usada ainda.',
}

const es: Strings = {
  command: 'Abre el panel con el recuento de llamadas por herramienta',
  title: 'Herramientas',
  opened: 'Panel de herramientas abierto.',
  label: 'herramientas',
  calls: total => `${total} llamadas`,
  empty: 'Ninguna herramienta usada todavía.',
}

export const STRINGS = { en, pt, es }
