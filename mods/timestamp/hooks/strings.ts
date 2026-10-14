const en = {
  locale: 'en-US',
  command: 'Epoch and date conversions: now, or the moment of an epoch or a date',
  hint: '[epoch | date]',
  usage: 'Usage: /ts [epoch | date]  e.g. /ts 1700000000  or  /ts 2024-03-01T12:00:00Z',
  seconds: 'seconds',
  millis: 'millis',
  iso: 'iso 8601',
  local: 'local',
  relative: 'relative',
  ago: (text: string) => `${text} ago`,
  ahead: (text: string) => `in ${text}`,
  now: 'now',
  guess: (unit: string) => `Read as ${unit}.`,
  unitSeconds: 'seconds',
  unitMillis: 'milliseconds',
  units: { d: 'd', h: 'h', m: 'min', s: 's' },
}

type Strings = typeof en

const pt: Strings = {
  locale: 'pt-BR',
  command: 'Conversões de epoch e data: agora, ou o instante de um epoch ou de uma data',
  hint: '[epoch | data]',
  usage: 'Uso: /ts [epoch | data]  ex.: /ts 1700000000  ou  /ts 2024-03-01T12:00:00Z',
  seconds: 'segundos',
  millis: 'milissegundos',
  iso: 'iso 8601',
  local: 'local',
  relative: 'relativo',
  ago: text => `há ${text}`,
  ahead: text => `em ${text}`,
  now: 'agora',
  guess: unit => `Lido como ${unit}.`,
  unitSeconds: 'segundos',
  unitMillis: 'milissegundos',
  units: { d: 'd', h: 'h', m: 'min', s: 's' },
}

const es: Strings = {
  locale: 'es-ES',
  command: 'Conversiones de epoch y fecha: ahora, o el instante de un epoch o de una fecha',
  hint: '[epoch | fecha]',
  usage: 'Uso: /ts [epoch | fecha]  p. ej.: /ts 1700000000  o  /ts 2024-03-01T12:00:00Z',
  seconds: 'segundos',
  millis: 'milisegundos',
  iso: 'iso 8601',
  local: 'local',
  relative: 'relativo',
  ago: text => `hace ${text}`,
  ahead: text => `en ${text}`,
  now: 'ahora',
  guess: unit => `Leído como ${unit}.`,
  unitSeconds: 'segundos',
  unitMillis: 'milisegundos',
  units: { d: 'd', h: 'h', m: 'min', s: 's' },
}

export const STRINGS = { en, pt, es }
