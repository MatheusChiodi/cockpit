const en = {
  capped: (count: number) => `git-log-limit: git log limited to ${count} commits`,
}

type Strings = typeof en

const pt: Strings = {
  capped: count => `git-log-limit: git log limitado a ${count} commits`,
}

const es: Strings = {
  capped: count => `git-log-limit: git log limitado a ${count} commits`,
}

export const STRINGS = { en, pt, es }
