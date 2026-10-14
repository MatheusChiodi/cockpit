const en = {
  command: 'Stash the working tree with a message, pop the latest stash, or list the stashes',
  hint: '[save <message> | pop | list]',
  usage: 'Usage: /gst [save <message> | pop | list]',
  noGit: 'git not found or not a repository.',
  noStashes: 'No stashes.',
  nothing: 'Nothing to stash.',
  stashed: (message: string) => `Stashed: ${message}`,
  confirm: (top: string) => `Pop the latest stash (${top}) into the working tree?`,
  yes: 'yes',
  no: 'no',
  cancelled: 'Cancelled.',
  popped: 'Stash popped.',
  failed: (reason: string) => `git refused: ${reason}`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Guarda a árvore de trabalho com uma mensagem, aplica o último stash ou lista os stashes',
  hint: '[save <mensagem> | pop | list]',
  usage: 'Uso: /gst [save <mensagem> | pop | list]',
  noGit: 'git não encontrado ou não é um repositório.',
  noStashes: 'Nenhum stash.',
  nothing: 'Nada para guardar.',
  stashed: message => `Guardado: ${message}`,
  confirm: top => `Aplicar o último stash (${top}) na árvore de trabalho?`,
  yes: 'sim',
  no: 'não',
  cancelled: 'Cancelado.',
  popped: 'Stash aplicado.',
  failed: reason => `git recusou: ${reason}`,
}

const es: Strings = {
  command: 'Guarda el árbol de trabajo con un mensaje, aplica el último stash o lista los stashes',
  hint: '[save <mensaje> | pop | list]',
  usage: 'Uso: /gst [save <mensaje> | pop | list]',
  noGit: 'git no encontrado o no es un repositorio.',
  noStashes: 'No hay stashes.',
  nothing: 'Nada que guardar.',
  stashed: message => `Guardado: ${message}`,
  confirm: top => `¿Aplicar el último stash (${top}) en el árbol de trabajo?`,
  yes: 'sí',
  no: 'no',
  cancelled: 'Cancelado.',
  popped: 'Stash aplicado.',
  failed: reason => `git rechazó: ${reason}`,
}

export const STRINGS = { en, pt, es }
