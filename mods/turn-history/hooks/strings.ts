const en = {
  command: 'Open the pane with one row per finished turn: duration, tool calls and output tokens',
  opened: 'Turns pane opened.',
  title: 'turns',
  paneTitle: 'Turns',
  summary: (count: number, failed: number) => `${count} turns  ${failed} failed`,
  empty: 'No turn has finished yet. This pane gets a row each time Claude finishes answering.',
  calls: (count: number) => `${count} calls`,
  tokens: (count: number) => `${count} out`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Abre o painel com uma linha por turno concluído: duração, chamadas de ferramenta e tokens de saída',
  opened: 'Painel de turnos aberto.',
  title: 'turnos',
  paneTitle: 'Turnos',
  summary: (count, failed) => `${count} turnos  ${failed} com falha`,
  empty: 'Nenhum turno terminou ainda. O painel ganha uma linha cada vez que Claude termina de responder.',
  calls: count => `${count} chamadas`,
  tokens: count => `${count} saída`,
}

const es: Strings = {
  command: 'Abre el panel con una fila por turno terminado: duración, llamadas de herramienta y tokens de salida',
  opened: 'Panel de turnos abierto.',
  title: 'turnos',
  paneTitle: 'Turnos',
  summary: (count, failed) => `${count} turnos  ${failed} con fallo`,
  empty: 'Ningún turno ha terminado aún. El panel gana una fila cada vez que Claude termina de responder.',
  calls: count => `${count} llamadas`,
  tokens: count => `${count} salida`,
}

export const STRINGS = { en, pt, es }
