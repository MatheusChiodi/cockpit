const en = {
  label: 'release',
  since: (count: number, tag: string) => `${count} since ${tag}`,
  notBumped: 'not bumped',
  untagged: 'ready to tag',
}

type Strings = typeof en

const pt: Strings = {
  label: 'release',
  since: (count, tag) => `${count} desde ${tag}`,
  notBumped: 'sem bump',
  untagged: 'pronto para tag',
}

const es: Strings = {
  label: 'release',
  since: (count, tag) => `${count} desde ${tag}`,
  notBumped: 'sin bump',
  untagged: 'listo para tag',
}

export const STRINGS = { en, pt, es }
