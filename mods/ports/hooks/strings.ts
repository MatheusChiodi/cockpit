const en = {
  command: 'Probe the common dev ports on localhost and list the ones that answer',
  none: 'No dev port answers on localhost.',
  summary: (open: number, total: number) => `${open} of ${total} ports answer`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Sonda as portas de desenvolvimento comuns no localhost e lista as que respondem',
  none: 'Nenhuma porta de desenvolvimento responde no localhost.',
  summary: (open, total) => `${open} de ${total} portas respondem`,
}

const es: Strings = {
  command: 'Sondea los puertos de desarrollo comunes en localhost y lista los que responden',
  none: 'Ningún puerto de desarrollo responde en localhost.',
  summary: (open, total) => `${open} de ${total} puertos responden`,
}

export const STRINGS = { en, pt, es }
