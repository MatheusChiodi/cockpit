const en = {
  label: 'todo',
  added: (count: number) => `+${count} new`,
}

type Strings = typeof en

const pt: Strings = {
  label: 'todo',
  added: count => `+${count} ${count === 1 ? 'novo' : 'novos'}`,
}

const es: Strings = {
  label: 'todo',
  added: count => `+${count} ${count === 1 ? 'nuevo' : 'nuevos'}`,
}

export const STRINGS = { en, pt, es }
