const en = {
  command: 'Start a pomodoro with a countdown in the status line; /pomodoro stop cancels',
  hint: '[minutes|stop]',
  focus: (minutes: number) => `focus ${minutes} min`,
  done: 'Pomodoro finished. Time for a break.',
  title: 'Pomodoro',
  cancelled: 'Pomodoro cancelled.',
  usage: 'Usage: /pomodoro [minutes from 1 to 240 | stop]',
  started: (minutes: number) => `${minutes} min pomodoro started.`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Inicia um pomodoro com contagem na status line; /pomodoro stop cancela',
  hint: '[minutos|stop]',
  focus: minutes => `foco ${minutes} min`,
  done: 'Pomodoro concluído. Hora da pausa.',
  title: 'Pomodoro',
  cancelled: 'Pomodoro cancelado.',
  usage: 'Uso: /pomodoro [minutos de 1 a 240 | stop]',
  started: minutes => `Pomodoro de ${minutes} min iniciado.`,
}

const es: Strings = {
  command: 'Inicia un pomodoro con cuenta atrás en la status line; /pomodoro stop lo cancela',
  hint: '[minutos|stop]',
  focus: minutes => `foco ${minutes} min`,
  done: 'Pomodoro terminado. Hora de la pausa.',
  title: 'Pomodoro',
  cancelled: 'Pomodoro cancelado.',
  usage: 'Uso: /pomodoro [minutos de 1 a 240 | stop]',
  started: minutes => `Pomodoro de ${minutes} min iniciado.`,
}

export const STRINGS = { en, pt, es }
