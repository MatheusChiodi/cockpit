const en = {
  command: 'Time box for the task at hand: counts down on the status line, warns at 80%; /timebox done closes it',
  hint: '<minutes> <what> | done',
  usage: (max: number) => `Usage: /timebox <minutes, 1 to ${max}> <what> or /timebox done`,
  running: (what: string) => `A time box is running: ${what}. Close it with /timebox done.`,
  none: 'No time box is running.',
  started: (minutes: number, what: string) => `Time box of ${minutes} min started: ${what}`,
  closed: (spent: number, total: number, what: string) => `Time box closed after ${spent} of ${total} min: ${what}`,
  status: (minutes: number, what: string) => `timebox ${minutes} min left · ${what}`,
  warn: (minutes: number, what: string) => `80% of the box is gone, ${minutes} min left: ${what}`,
  over: (what: string) => `Time is up: ${what}`,
  title: 'Time box',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Time box para a tarefa em mãos: contagem na status line, avisa em 80%; /timebox done encerra',
  hint: '<minutos> <o quê> | done',
  usage: max => `Uso: /timebox <minutos, de 1 a ${max}> <o quê> ou /timebox done`,
  running: what => `Já há um time box em andamento: ${what}. Encerre com /timebox done.`,
  none: 'Nenhum time box em andamento.',
  started: (minutes, what) => `Time box de ${minutes} min iniciado: ${what}`,
  closed: (spent, total, what) => `Time box encerrado após ${spent} de ${total} min: ${what}`,
  status: (minutes, what) => `timebox ${minutes} min restantes · ${what}`,
  warn: (minutes, what) => `80% do time box usado, restam ${minutes} min: ${what}`,
  over: what => `Acabou o tempo: ${what}`,
  title: 'Time box',
}

const es: Strings = {
  command: 'Time box para la tarea en curso: cuenta atrás en la línea de estado, avisa al 80%; /timebox done lo cierra',
  hint: '<minutos> <qué> | done',
  usage: max => `Uso: /timebox <minutos, de 1 a ${max}> <qué> o /timebox done`,
  running: what => `Ya hay un time box en marcha: ${what}. Ciérralo con /timebox done.`,
  none: 'No hay ningún time box en marcha.',
  started: (minutes, what) => `Time box de ${minutes} min iniciado: ${what}`,
  closed: (spent, total, what) => `Time box cerrado tras ${spent} de ${total} min: ${what}`,
  status: (minutes, what) => `timebox ${minutes} min restantes · ${what}`,
  warn: (minutes, what) => `80% del time box usado, quedan ${minutes} min: ${what}`,
  over: what => `Se acabó el tiempo: ${what}`,
  title: 'Time box',
}

export const STRINGS = { en, pt, es }
