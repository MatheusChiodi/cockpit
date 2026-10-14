const en = {
  label: 'migrations',
  added: (count: number) => `${count} new`,
  edited: (count: number) => `${count} edited`,
}

type Strings = typeof en

const pt: Strings = {
  label: 'migrations',
  added: count => `${count} ${count === 1 ? 'nova' : 'novas'}`,
  edited: count => `${count} ${count === 1 ? 'editada' : 'editadas'}`,
}

const es: Strings = {
  label: 'migrations',
  added: count => `${count} ${count === 1 ? 'nueva' : 'nuevas'}`,
  edited: count => `${count} ${count === 1 ? 'editada' : 'editadas'}`,
}

export const STRINGS = { en, pt, es }
