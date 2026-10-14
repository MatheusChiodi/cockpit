const en = {
  label: 'focus',
  command: 'Focus block with a progress bar pinned above the prompt; /focus stop cancels it',
  hint: '[minutes|stop]',
  usage: 'Usage: /focus [minutes from 1 to 240 | stop]',
  cancelled: 'Focus block cancelled.',
  started: (minutes: number) => `${minutes} min focus block started.`,
  done: 'Focus block finished. Time for a break.',
  notifyTitle: 'Focus',
  left: (minutes: number) => `${minutes} min`,
  of: (total: number) => ` of ${total}`,
}

type Strings = typeof en

const pt: Strings = {
  label: 'foco',
  command: 'Bloco de foco com barra de progresso fixa acima do prompt; /focus stop cancela',
  hint: '[minutos|stop]',
  usage: 'Uso: /focus [minutos de 1 a 240 | stop]',
  cancelled: 'Bloco de foco cancelado.',
  started: minutes => `Bloco de foco de ${minutes} min iniciado.`,
  done: 'Bloco de foco concluído. Hora da pausa.',
  notifyTitle: 'Foco',
  left: minutes => `${minutes} min`,
  of: total => ` de ${total}`,
}

const es: Strings = {
  label: 'foco',
  command: 'Bloque de foco con barra de progreso fija sobre el prompt; /focus stop lo cancela',
  hint: '[minutos|stop]',
  usage: 'Uso: /focus [minutos de 1 a 240 | stop]',
  cancelled: 'Bloque de foco cancelado.',
  started: minutes => `Bloque de foco de ${minutes} min iniciado.`,
  done: 'Bloque de foco terminado. Hora de descansar.',
  notifyTitle: 'Foco',
  left: minutes => `${minutes} min`,
  of: total => ` de ${total}`,
}

export const STRINGS = { en, pt, es }
