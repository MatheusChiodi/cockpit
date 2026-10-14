const en = {
  command: 'Find the process listening on a port and end it after you confirm',
  hint: '<port>',
  usage: 'Usage: /killport <port>  (1-65535)',
  free: (port: number) => `Nothing is listening on port ${port}.`,
  lookupFailed: 'Could not look up the port (netstat / lsof missing).',
  confirm: (port: number, who: string) => `Port ${port} is held by ${who}. End it?`,
  yes: 'yes',
  no: 'no',
  cancelled: 'Cancelled.',
  ended: (who: string) => `Ended ${who}.`,
  failed: (who: string) => `Could not end ${who}.`,
  unknown: 'unknown process',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Encontra o processo que escuta numa porta e o encerra após confirmar',
  hint: '<porta>',
  usage: 'Uso: /killport <porta>  (1-65535)',
  free: port => `Nada escuta na porta ${port}.`,
  lookupFailed: 'Não foi possível consultar a porta (netstat / lsof ausente).',
  confirm: (port, who) => `A porta ${port} está com ${who}. Encerrar?`,
  yes: 'sim',
  no: 'não',
  cancelled: 'Cancelado.',
  ended: who => `Encerrou ${who}.`,
  failed: who => `Não foi possível encerrar ${who}.`,
  unknown: 'processo desconhecido',
}

const es: Strings = {
  command: 'Encuentra el proceso que escucha en un puerto y lo termina tras confirmar',
  hint: '<puerto>',
  usage: 'Uso: /killport <puerto>  (1-65535)',
  free: port => `Nada escucha en el puerto ${port}.`,
  lookupFailed: 'No se pudo consultar el puerto (falta netstat / lsof).',
  confirm: (port, who) => `El puerto ${port} lo tiene ${who}. ¿Terminarlo?`,
  yes: 'sí',
  no: 'no',
  cancelled: 'Cancelado.',
  ended: who => `Terminó ${who}.`,
  failed: who => `No se pudo terminar ${who}.`,
  unknown: 'proceso desconocido',
}

export const STRINGS = { en, pt, es }
