const en = {
  late: (time: string) => `It is ${time}. Park the work and pick it up tomorrow.`,
}

type Strings = typeof en

const pt: Strings = {
  late: time => `São ${time}. Deixe o trabalho de lado e retome amanhã.`,
}

const es: Strings = {
  late: time => `Son las ${time}. Deja el trabajo y retómalo mañana.`,
}

export const STRINGS = { en, pt, es }
