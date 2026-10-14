const en = {
  command: 'Open the pane with the shell commands of the session, status and duration',
  title: 'Commands',
  opened: 'Commands pane opened.',
  label: 'commands',
  summary: (ran: number, failed: number) => `${ran} run · ${failed} failed`,
  empty: 'No command run yet.',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Abre o painel com os comandos de shell da sessão, status e duração',
  title: 'Comandos',
  opened: 'Painel de comandos aberto.',
  label: 'comandos',
  summary: (ran, failed) => `${ran} rodados · ${failed} com erro`,
  empty: 'Nenhum comando executado ainda.',
}

const es: Strings = {
  command: 'Abre el panel con los comandos de shell de la sesión, estado y duración',
  title: 'Comandos',
  opened: 'Panel de comandos abierto.',
  label: 'comandos',
  summary: (ran, failed) => `${ran} ejecutados · ${failed} con error`,
  empty: 'Ningún comando ejecutado todavía.',
}

export const STRINGS = { en, pt, es }
