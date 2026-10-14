const en = {
  blocked: (why: string) => `git-guard blocked the command: ${why}. Ask the user to run it by hand if it is intended.`,
  failed: 'git-guard: the check failed, command refused.',
  forcePush: 'git push --force rewrites the remote history (use --force-with-lease)',
  resetHard: 'git reset --hard discards local changes',
  clean: 'git clean -f deletes untracked files',
  discardAll: 'discards every change in the directory',
  noVerify: '--no-verify skips the repository hooks',
  stash: 'deletes stashes for good',
  branchDelete: 'git branch -D deletes the branch even when unmerged',
}

type Strings = typeof en

const pt: Strings = {
  blocked: why => `git-guard bloqueou o comando: ${why}. Peça ao usuário para rodar manualmente se for intencional.`,
  failed: 'git-guard: a verificação falhou, comando recusado.',
  forcePush: 'git push --force reescreve o histórico remoto (use --force-with-lease)',
  resetHard: 'git reset --hard descarta alterações locais',
  clean: 'git clean -f apaga arquivos não versionados',
  discardAll: 'descarta todas as alterações do diretório',
  noVerify: '--no-verify pula os hooks do repositório',
  stash: 'apaga stashes sem volta',
  branchDelete: 'git branch -D apaga a branch mesmo sem merge',
}

const es: Strings = {
  blocked: why => `git-guard bloqueó el comando: ${why}. Pide al usuario que lo ejecute a mano si es intencional.`,
  failed: 'git-guard: la verificación falló, comando rechazado.',
  forcePush: 'git push --force reescribe el historial remoto (usa --force-with-lease)',
  resetHard: 'git reset --hard descarta los cambios locales',
  clean: 'git clean -f borra los archivos sin versionar',
  discardAll: 'descarta todos los cambios del directorio',
  noVerify: '--no-verify omite los hooks del repositorio',
  stash: 'borra stashes sin vuelta atrás',
  branchDelete: 'git branch -D borra la rama aunque no esté fusionada',
}

export type Reason = 'forcePush' | 'resetHard' | 'clean' | 'discardAll' | 'noVerify' | 'stash' | 'branchDelete'

export const STRINGS = { en, pt, es }
