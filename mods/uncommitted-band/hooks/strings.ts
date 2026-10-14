const en = {
  label: 'commit',
  files: (count: number) => `${count} uncommitted file${count === 1 ? '' : 's'}`,
  last: (span: string) => `last ${span} ago`,
}

type Strings = typeof en

const pt: Strings = {
  label: 'commit',
  files: (count: number) => `${count} arquivo${count === 1 ? '' : 's'} sem commit`,
  last: (span: string) => `último há ${span}`,
}

const es: Strings = {
  label: 'commit',
  files: (count: number) => `${count} archivo${count === 1 ? '' : 's'} sin commit`,
  last: (span: string) => `último hace ${span}`,
}

export const STRINGS = { en, pt, es }
