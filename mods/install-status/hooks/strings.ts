const en = {
  label: 'install',
  missing: 'node_modules missing',
  stale: 'lockfile newer',
}

type Strings = typeof en

const pt: Strings = {
  label: 'instalação',
  missing: 'node_modules ausente',
  stale: 'lockfile mais novo',
}

const es: Strings = {
  label: 'instalación',
  missing: 'node_modules ausente',
  stale: 'lockfile más nuevo',
}

export const STRINGS = { en, pt, es }
