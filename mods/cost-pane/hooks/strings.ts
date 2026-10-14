const en = {
  command: 'Open the pane with the cost of each turn and the session total',
  opened: 'Spend pane opened.',
  title: 'spend',
  paneTitle: 'Spend',
  summary: (total: string, count: number) => `${total} total  ${count} turns`,
  empty: 'No turn has been priced yet. This pane gets a row as each turn finishes and its cost is measured.',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Abre o painel com o custo de cada turno e o total da sessão',
  opened: 'Painel de gastos aberto.',
  title: 'gastos',
  paneTitle: 'Gastos',
  summary: (total, count) => `${total} no total  ${count} turnos`,
  empty: 'Nenhum turno foi precificado ainda. O painel ganha uma linha quando cada turno termina e o custo é medido.',
}

const es: Strings = {
  command: 'Abre el panel con el costo de cada turno y el total de la sesión',
  opened: 'Panel de gastos abierto.',
  title: 'gastos',
  paneTitle: 'Gastos',
  summary: (total, count) => `${total} en total  ${count} turnos`,
  empty: 'Ningún turno ha sido tarifado aún. El panel gana una fila cuando cada turno termina y se mide su costo.',
}

export const STRINGS = { en, pt, es }
