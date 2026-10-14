const en = {
  command: 'Open the pane with every test run of this session',
  opened: 'Test log pane opened.',
  title: 'test log',
  empty: 'No test run yet.',
  summary: (runs: number, failed: number) => `${runs} runs · ${failed} failed`,
  locale: 'en-US',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Abre o painel com cada execução de testes desta sessão',
  opened: 'Painel do log de testes aberto.',
  title: 'log de testes',
  empty: 'Nenhum teste rodou ainda.',
  summary: (runs, failed) => `${runs} execuções · ${failed} falharam`,
  locale: 'pt-BR',
}

const es: Strings = {
  command: 'Abre el panel con cada ejecución de pruebas de esta sesión',
  opened: 'Panel del registro de pruebas abierto.',
  title: 'registro de pruebas',
  empty: 'Aún no se ejecutaron pruebas.',
  summary: (runs, failed) => `${runs} ejecuciones · ${failed} fallaron`,
  locale: 'es-ES',
}

export const STRINGS = { en, pt, es }
