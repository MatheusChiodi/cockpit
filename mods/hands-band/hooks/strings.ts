const en = {
  label: 'hands',
  claude: (count: number) => `Claude ${count}`,
  you: (count: number) => `you ${count}`,
  tail: 'uncommitted',
}

type Strings = typeof en

const pt: Strings = {
  label: 'mãos',
  claude: count => `Claude ${count}`,
  you: count => `você ${count}`,
  tail: 'sem commit',
}

const es: Strings = {
  label: 'manos',
  claude: count => `Claude ${count}`,
  you: count => `tú ${count}`,
  tail: 'sin commit',
}

export const STRINGS = { en, pt, es }
