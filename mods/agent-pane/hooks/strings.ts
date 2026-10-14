const en = {
  command: 'Open the pane with the session subagents, their type and status',
  opened: 'Crew pane opened.',
  title: 'crew',
  paneTitle: 'Crew',
  summary: (count: number, active: number) => `${count} subagents  ${active} running`,
  empty: 'No subagent yet. This pane lists them as Claude spawns them, and refreshes while any runs.',
  status: {
    pending: 'pending',
    running: 'running',
    waiting: 'waiting',
    idle: 'idle',
    completed: 'completed',
    failed: 'failed',
    killed: 'killed',
  } as Record<string, string>,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Abre o painel com os subagentes da sessão, o tipo e o status de cada um',
  opened: 'Painel da equipe aberto.',
  title: 'equipe',
  paneTitle: 'Equipe',
  summary: (count, active) => `${count} subagentes  ${active} rodando`,
  empty: 'Nenhum subagente ainda. O painel os lista conforme Claude os cria e atualiza enquanto algum roda.',
  status: {
    pending: 'pendente',
    running: 'rodando',
    waiting: 'esperando',
    idle: 'ocioso',
    completed: 'concluído',
    failed: 'falhou',
    killed: 'encerrado',
  },
}

const es: Strings = {
  command: 'Abre el panel con los subagentes de la sesión, su tipo y estado',
  opened: 'Panel del equipo abierto.',
  title: 'equipo',
  paneTitle: 'Equipo',
  summary: (count, active) => `${count} subagentes  ${active} en ejecución`,
  empty: 'Aún no hay subagentes. El panel los lista cuando Claude los crea y se actualiza mientras alguno se ejecuta.',
  status: {
    pending: 'pendiente',
    running: 'ejecutando',
    waiting: 'esperando',
    idle: 'inactivo',
    completed: 'completado',
    failed: 'falló',
    killed: 'terminado',
  },
}

export const STRINGS = { en, pt, es }
