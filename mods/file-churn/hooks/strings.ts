const en = {
  churn: (file: string, times: number, minutes: number) =>
    `${file} edited ${times} times in ${minutes} min. Step back and look at the whole?`,
}

type Strings = typeof en

const pt: Strings = {
  churn: (file, times, minutes) => `${file} editado ${times} vezes em ${minutes} min. Dê um passo atrás e olhe o conjunto?`,
}

const es: Strings = {
  churn: (file, times, minutes) => `${file} editado ${times} veces en ${minutes} min. ¿Un paso atrás para mirar el conjunto?`,
}

export const STRINGS = { en, pt, es }
