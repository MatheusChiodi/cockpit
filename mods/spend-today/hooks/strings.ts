const en = {
  today: 'today',
  sessions: (n: number) => `${n} session${n === 1 ? '' : 's'}`,
}

type Strings = typeof en

const pt: Strings = {
  today: 'hoje',
  sessions: (n: number) => `${n} sess${n === 1 ? 'ão' : 'ões'}`,
}

const es: Strings = {
  today: 'hoy',
  sessions: (n: number) => `${n} sesion${n === 1 ? '' : 'es'}`,
}

export const STRINGS = { en, pt, es }
