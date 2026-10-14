const en = {
  last: (when: string, text: string) => `Last time (${when}): ${text}`,
  minutes: (n: number) => `${n} min ago`,
  hours: (n: number) => `${n} h ago`,
  yesterday: 'yesterday',
  days: (n: number) => `${n} days ago`,
}

type Strings = typeof en

const pt: Strings = {
  last: (when, text) => `Da última vez (${when}): ${text}`,
  minutes: n => `há ${n} min`,
  hours: n => `há ${n} h`,
  yesterday: 'ontem',
  days: n => `há ${n} dias`,
}

const es: Strings = {
  last: (when, text) => `La última vez (${when}): ${text}`,
  minutes: n => `hace ${n} min`,
  hours: n => `hace ${n} h`,
  yesterday: 'ayer',
  days: n => `hace ${n} días`,
}

export const STRINGS = { en, pt, es }
