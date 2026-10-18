const en = {
  label: 'green',
  now: 'now',
  ago: (age: string) => `${age} ago`,
  edits: (count: number) => (count === 1 ? '1 edit since' : `${count} edits since`),
}

type Strings = typeof en

const pt: Strings = {
  label: 'verde',
  now: 'agora',
  ago: age => `há ${age}`,
  edits: count => (count === 1 ? '1 edição desde então' : `${count} edições desde então`),
}

const es: Strings = {
  label: 'verde',
  now: 'ahora',
  ago: age => `hace ${age}`,
  edits: count => (count === 1 ? '1 edición desde entonces' : `${count} ediciones desde entonces`),
}

export const STRINGS = { en, pt, es }
