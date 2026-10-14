const en = {
  label: 'env',
  tracked: 'tracked by git',
  notIgnored: 'not ignored',
}

type Strings = typeof en

const pt: Strings = {
  label: 'env',
  tracked: 'rastreado pelo git',
  notIgnored: 'fora do .gitignore',
}

const es: Strings = {
  label: 'env',
  tracked: 'rastreado por git',
  notIgnored: 'fuera de .gitignore',
}

export const STRINGS = { en, pt, es }
