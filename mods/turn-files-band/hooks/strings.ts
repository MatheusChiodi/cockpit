const en = {
  label: 'touched',
  read: (count: number) => `${count} read`,
  edited: (count: number) => `${count} edited`,
  more: (count: number) => `+${count}`,
}

type Strings = typeof en

const pt: Strings = {
  label: 'tocados',
  read: count => `${count} lidos`,
  edited: count => `${count} editados`,
  more: count => `+${count}`,
}

const es: Strings = {
  label: 'tocados',
  read: count => `${count} leídos`,
  edited: count => `${count} editados`,
  more: count => `+${count}`,
}

export const STRINGS = { en, pt, es }
