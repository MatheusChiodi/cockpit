const en = {
  command: 'Commit the staged changes as a fixup of a commit (HEAD by default), to squash later with rebase --autosquash',
  hint: '[commit]',
  noGit: 'Not a git repository (or git is not available).',
  nothingStaged: 'Nothing is staged. Stage the changes first (/stage).',
  unknown: (target: string) => `No such commit: ${target}`,
  confirm: (commit: string) => `Create a fixup commit for "${commit}" with the staged changes?`,
  yes: 'yes',
  no: 'no',
  cancelled: 'Cancelled.',
  done: (commit: string) => `Fixup created for ${commit}. Squash it with: git rebase -i --autosquash <base>`,
  failed: (why: string) => `git failed: ${why}`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Commita o que está no stage como fixup de um commit (HEAD por padrão), para juntar depois com rebase --autosquash',
  hint: '[commit]',
  noGit: 'Não é um repositório git (ou o git não está disponível).',
  nothingStaged: 'Nada no stage. Adicione as mudanças primeiro (/stage).',
  unknown: target => `Commit inexistente: ${target}`,
  confirm: commit => `Criar um commit fixup de "${commit}" com o que está no stage?`,
  yes: 'sim',
  no: 'não',
  cancelled: 'Cancelado.',
  done: commit => `Fixup criado para ${commit}. Junte com: git rebase -i --autosquash <base>`,
  failed: why => `o git falhou: ${why}`,
}

const es: Strings = {
  command: 'Commitea lo que está en el stage como fixup de un commit (HEAD por defecto), para unirlo después con rebase --autosquash',
  hint: '[commit]',
  noGit: 'No es un repositorio git (o git no está disponible).',
  nothingStaged: 'Nada en el stage. Agrega los cambios primero (/stage).',
  unknown: target => `Commit inexistente: ${target}`,
  confirm: commit => `¿Crear un commit fixup de "${commit}" con lo que está en el stage?`,
  yes: 'sí',
  no: 'no',
  cancelled: 'Cancelado.',
  done: commit => `Fixup creado para ${commit}. Únelo con: git rebase -i --autosquash <base>`,
  failed: why => `git falló: ${why}`,
}

export const STRINGS = { en, pt, es }
