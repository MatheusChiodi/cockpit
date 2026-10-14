const en = {
  label: 'index',
  staged: 'staged',
  unstaged: 'unstaged',
  untracked: 'new',
}

type Strings = typeof en

const pt: Strings = {
  label: 'index',
  staged: 'no stage',
  unstaged: 'fora',
  untracked: 'novos',
}

const es: Strings = {
  label: 'index',
  staged: 'en stage',
  unstaged: 'fuera',
  untracked: 'nuevos',
}

export const STRINGS = { en, pt, es }
