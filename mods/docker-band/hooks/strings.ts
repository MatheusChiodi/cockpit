const en = {
  label: 'docker',
  daemonDown: 'daemon down',
  compose: (up: number, total: number) => `compose ${up}/${total} up`,
  stopped: 'stopped',
}

type Strings = typeof en

const pt: Strings = {
  label: 'docker',
  daemonDown: 'daemon parado',
  compose: (up, total) => `compose ${up}/${total} no ar`,
  stopped: 'parados',
}

const es: Strings = {
  label: 'docker',
  daemonDown: 'daemon caído',
  compose: (up, total) => `compose ${up}/${total} activos`,
  stopped: 'detenidos',
}

export const STRINGS = { en, pt, es }
