const en = {
  command: 'Open the pane with the context window by category, each with a gauge and its share',
  opened: 'Window pane opened.',
  title: 'window',
  paneTitle: 'Window',
  summary: (used: string, max: string, percent: number) => `${used} of ${max}  ${percent}%`,
  empty: 'Nothing measured yet. Press Refresh, or wait for a turn to end.',
  refresh: 'Refresh',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Abre o painel com a janela de contexto por categoria, cada uma com medidor e participação',
  opened: 'Painel da janela aberto.',
  title: 'janela',
  paneTitle: 'Janela',
  summary: (used, max, percent) => `${used} de ${max}  ${percent}%`,
  empty: 'Nada medido ainda. Pressione Atualizar ou espere um turno terminar.',
  refresh: 'Atualizar',
}

const es: Strings = {
  command: 'Abre el panel con la ventana de contexto por categoría, cada una con medidor y participación',
  opened: 'Panel de la ventana abierto.',
  title: 'ventana',
  paneTitle: 'Ventana',
  summary: (used, max, percent) => `${used} de ${max}  ${percent}%`,
  empty: 'Nada medido aún. Pulsa Actualizar o espera a que termine un turno.',
  refresh: 'Actualizar',
}

export const STRINGS = { en, pt, es }
