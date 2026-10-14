const en = {
  onProtected: (branch: string) =>
    `main-branch-guard: you are on "${branch}". Create a branch (git switch -c <name>) before commit/push/merge.`,
  failed: 'main-branch-guard: the check failed, command refused.',
}

type Strings = typeof en

const pt: Strings = {
  onProtected: branch =>
    `main-branch-guard: você está em "${branch}". Crie uma branch (git switch -c <nome>) antes de commit/push/merge.`,
  failed: 'main-branch-guard: a verificação falhou, comando recusado.',
}

const es: Strings = {
  onProtected: branch =>
    `main-branch-guard: estás en "${branch}". Crea una rama (git switch -c <nombre>) antes de commit/push/merge.`,
  failed: 'main-branch-guard: la verificación falló, comando rechazado.',
}

export const STRINGS = { en, pt, es }
