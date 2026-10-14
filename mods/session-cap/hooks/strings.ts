const en = {
  long: (hours: number) => `${hours} hours straight in this session. Time to stop and rest.`,
}

type Strings = typeof en

const pt: Strings = {
  long: hours => `${hours} horas seguidas nesta sessão. Hora de parar e descansar.`,
}

const es: Strings = {
  long: hours => `${hours} horas seguidas en esta sesión. Es hora de parar y descansar.`,
}

export const STRINGS = { en, pt, es }
