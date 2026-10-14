const en = {
  command: 'Show what is staged, unstaged and new, or stage (and with -r unstage) the paths you name',
  hint: '[-r] [path ...]',
  noGit: 'Not a git repository (or git is not available).',
  clean: 'Nothing to stage: the working tree is clean.',
  staged: 'Staged',
  unstaged: 'Unstaged',
  untracked: 'New',
  confirmAdd: (count: number) => `Stage ${count} path(s)?`,
  confirmRestore: (count: number) => `Unstage ${count} path(s)?`,
  yes: 'yes',
  no: 'no',
  cancelled: 'Cancelled.',
  added: (count: number) => `Staged ${count} path(s).`,
  restored: (count: number) => `Unstaged ${count} path(s).`,
  failed: (why: string) => `git failed: ${why}`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Mostra o que está no stage, fora dele e novo, ou adiciona ao stage (com -r tira) os caminhos informados',
  hint: '[-r] [caminho ...]',
  noGit: 'Não é um repositório git (ou o git não está disponível).',
  clean: 'Nada para o stage: a árvore de trabalho está limpa.',
  staged: 'No stage',
  unstaged: 'Fora do stage',
  untracked: 'Novos',
  confirmAdd: count => `Adicionar ${count} caminho(s) ao stage?`,
  confirmRestore: count => `Tirar ${count} caminho(s) do stage?`,
  yes: 'sim',
  no: 'não',
  cancelled: 'Cancelado.',
  added: count => `${count} caminho(s) no stage.`,
  restored: count => `${count} caminho(s) fora do stage.`,
  failed: why => `o git falhou: ${why}`,
}

const es: Strings = {
  command: 'Muestra lo que está en el stage, fuera de él y nuevo, o agrega al stage (con -r quita) las rutas indicadas',
  hint: '[-r] [ruta ...]',
  noGit: 'No es un repositorio git (o git no está disponible).',
  clean: 'Nada para el stage: el árbol de trabajo está limpio.',
  staged: 'En el stage',
  unstaged: 'Fuera del stage',
  untracked: 'Nuevos',
  confirmAdd: count => `¿Agregar ${count} ruta(s) al stage?`,
  confirmRestore: count => `¿Quitar ${count} ruta(s) del stage?`,
  yes: 'sí',
  no: 'no',
  cancelled: 'Cancelado.',
  added: count => `${count} ruta(s) en el stage.`,
  restored: count => `${count} ruta(s) fuera del stage.`,
  failed: why => `git falló: ${why}`,
}

export const STRINGS = { en, pt, es }
