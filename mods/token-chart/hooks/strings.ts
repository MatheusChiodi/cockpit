const en = {
  command: 'Open the pane with output tokens per turn as gauges scaled to the largest turn',
  opened: 'Tokens pane opened.',
  title: 'tokens',
  paneTitle: 'Tokens',
  summary: (total: string, count: number) => `${total} out  ${count} turns`,
  empty: 'No turn has finished yet. This pane draws one gauge per turn as Claude answers.',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Abre o painel com os tokens de saída por turno em medidores proporcionais ao maior turno',
  opened: 'Painel de tokens aberto.',
  title: 'tokens',
  paneTitle: 'Tokens',
  summary: (total, count) => `${total} de saída  ${count} turnos`,
  empty: 'Nenhum turno terminou ainda. O painel desenha um medidor por turno conforme Claude responde.',
}

const es: Strings = {
  command: 'Abre el panel con los tokens de salida por turno en medidores proporcionales al mayor turno',
  opened: 'Panel de tokens abierto.',
  title: 'tokens',
  paneTitle: 'Tokens',
  summary: (total, count) => `${total} de salida  ${count} turnos`,
  empty: 'Ningún turno ha terminado aún. El panel dibuja un medidor por turno a medida que Claude responde.',
}

export const STRINGS = { en, pt, es }
