const en = {
  label: 'ci',
  running: '… running',
  failed: 'failed',
  workflow: 'workflow',
}

type Strings = typeof en

const pt: Strings = {
  label: 'ci',
  running: '… rodando',
  failed: 'falhou',
  workflow: 'workflow',
}

const es: Strings = {
  label: 'ci',
  running: '… en curso',
  failed: 'falló',
  workflow: 'workflow',
}

export const STRINGS = { en, pt, es }
