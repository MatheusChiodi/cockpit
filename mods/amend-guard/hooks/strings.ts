const en = {
  confirm: (what: string, remote: string) =>
    `amend-guard: ${what} rewrites commits already on ${remote}; pushing will need --force. Confirm before running.`,
  amend: 'git commit --amend',
  rebase: 'git rebase',
  failed: 'amend-guard: the check failed, confirm before running.',
}

type Strings = typeof en

const pt: Strings = {
  confirm: (what, remote) =>
    `amend-guard: ${what} reescreve commits que já estão em ${remote}; o push vai exigir --force. Confirme antes de executar.`,
  amend: 'git commit --amend',
  rebase: 'git rebase',
  failed: 'amend-guard: a verificação falhou, confirme antes de executar.',
}

const es: Strings = {
  confirm: (what, remote) =>
    `amend-guard: ${what} reescribe commits que ya están en ${remote}; el push exigirá --force. Confirma antes de ejecutar.`,
  amend: 'git commit --amend',
  rebase: 'git rebase',
  failed: 'amend-guard: la verificación falló, confirma antes de ejecutar.',
}

export const STRINGS = { en, pt, es }
