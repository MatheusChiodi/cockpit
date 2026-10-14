const en = {
  command: 'Park an idea without leaving the work: /park <idea>, /park to list, /park done <n>, /park clear',
  hint: '<idea> | done <n> | clear',
  saved: (count: number) => `Parked (${count}). Back to work.`,
  empty: 'Nothing parked.',
  header: (count: number) => `Parked ideas (${count}):`,
  done: (text: string) => `Done: ${text}`,
  missing: (count: number) => `No idea with that number. There are ${count}.`,
  cleared: 'Parking lot cleared.',
  toast: (texts: string[]) => `Parked: ${texts.join(' · ')}`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Guarde uma ideia sem sair do trabalho: /park <ideia>, /park para listar, /park done <n>, /park clear',
  hint: '<ideia> | done <n> | clear',
  saved: count => `Guardada (${count}). De volta ao trabalho.`,
  empty: 'Nada guardado.',
  header: count => `Ideias guardadas (${count}):`,
  done: text => `Feito: ${text}`,
  missing: count => `Não há ideia com esse número. Existem ${count}.`,
  cleared: 'Estacionamento limpo.',
  toast: texts => `Guardado: ${texts.join(' · ')}`,
}

const es: Strings = {
  command: 'Guarda una idea sin salir del trabajo: /park <idea>, /park para listar, /park done <n>, /park clear',
  hint: '<idea> | done <n> | clear',
  saved: count => `Guardada (${count}). De vuelta al trabajo.`,
  empty: 'Nada guardado.',
  header: count => `Ideas guardadas (${count}):`,
  done: text => `Hecho: ${text}`,
  missing: count => `No hay una idea con ese número. Hay ${count}.`,
  cleared: 'Estacionamiento vaciado.',
  toast: texts => `Guardado: ${texts.join(' · ')}`,
}

export const STRINGS = { en, pt, es }
