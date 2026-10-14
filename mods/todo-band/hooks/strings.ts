const en = {
  label: 'todos',
  command: 'Pinned tasks above the prompt: /todo <text>, /todo done <n>, /todo rm <n>, /todo clear',
  hint: '<text> | done <n> | rm <n> | clear',
  usage: 'Usage: /todo <text> | done <n> | rm <n> | clear',
  cleared: 'Completed tasks removed.',
  missing: (value: string) => `No such task: ${value}`,
  toggled: (n: number, wasDone: boolean) => `Task ${n} ${wasDone ? 'reopened' : 'completed'}.`,
  removed: (n: number) => `Task ${n} removed.`,
  added: (n: number) => `Task ${n} added.`,
  hidden: (n: number) => `+${n} hidden`,
}

type Strings = typeof en

const pt: Strings = {
  label: 'tarefas',
  command: 'Tarefas fixas acima do prompt: /todo <texto>, /todo done <n>, /todo rm <n>, /todo clear',
  hint: '<texto> | done <n> | rm <n> | clear',
  usage: 'Uso: /todo <texto> | done <n> | rm <n> | clear',
  cleared: 'Tarefas concluídas removidas.',
  missing: value => `Tarefa inexistente: ${value}`,
  toggled: (n, wasDone) => `Tarefa ${n} ${wasDone ? 'reaberta' : 'concluída'}.`,
  removed: n => `Tarefa ${n} removida.`,
  added: n => `Tarefa ${n} adicionada.`,
  hidden: n => `+${n} ocultas`,
}

const es: Strings = {
  label: 'tareas',
  command: 'Tareas fijas sobre el prompt: /todo <texto>, /todo done <n>, /todo rm <n>, /todo clear',
  hint: '<texto> | done <n> | rm <n> | clear',
  usage: 'Uso: /todo <texto> | done <n> | rm <n> | clear',
  cleared: 'Tareas completadas eliminadas.',
  missing: value => `La tarea no existe: ${value}`,
  toggled: (n, wasDone) => `Tarea ${n} ${wasDone ? 'reabierta' : 'completada'}.`,
  removed: n => `Tarea ${n} eliminada.`,
  added: n => `Tarea ${n} añadida.`,
  hidden: n => `+${n} ocultas`,
}

export const STRINGS = { en, pt, es }
