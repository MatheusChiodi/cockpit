const en = {
  active: (hours: number, minutes: string) => `active ${hours}h${minutes} today`,
}

type Strings = typeof en

const pt: Strings = {
  active: (hours, minutes) => `ativo ${hours}h${minutes} hoje`,
}

const es: Strings = {
  active: (hours, minutes) => `activo ${hours}h${minutes} hoy`,
}

export const STRINGS = { en, pt, es }
