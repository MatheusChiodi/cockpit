const en = {
  command: 'Show the last commit and undo it with a soft reset (changes stay staged)',
  noGit: 'git not found or not a repository.',
  noCommit: 'No commit to undo.',
  pushed: (commit: string) => `Refused: ${commit} is already pushed.`,
  confirm: (commit: string) => `Undo ${commit}? The changes stay staged.`,
  yes: 'yes',
  no: 'no',
  cancelled: 'Cancelled.',
  undone: (commit: string) => `Undone: ${commit}`,
  failed: (reason: string) => `git refused: ${reason}`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Mostra o último commit e o desfaz com soft reset (as mudanças ficam staged)',
  noGit: 'git não encontrado ou não é um repositório.',
  noCommit: 'Nenhum commit para desfazer.',
  pushed: commit => `Recusado: ${commit} já foi enviado.`,
  confirm: commit => `Desfazer ${commit}? As mudanças ficam staged.`,
  yes: 'sim',
  no: 'não',
  cancelled: 'Cancelado.',
  undone: commit => `Desfeito: ${commit}`,
  failed: reason => `git recusou: ${reason}`,
}

const es: Strings = {
  command: 'Muestra el último commit y lo deshace con soft reset (los cambios quedan staged)',
  noGit: 'git no encontrado o no es un repositorio.',
  noCommit: 'No hay commit que deshacer.',
  pushed: commit => `Rechazado: ${commit} ya fue enviado.`,
  confirm: commit => `¿Deshacer ${commit}? Los cambios quedan staged.`,
  yes: 'sí',
  no: 'no',
  cancelled: 'Cancelado.',
  undone: commit => `Deshecho: ${commit}`,
  failed: reason => `git rechazó: ${reason}`,
}

export const STRINGS = { en, pt, es }
