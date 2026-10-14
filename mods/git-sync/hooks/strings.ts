const en = {
  command: 'Fetch and show how far the branch is from its base; with rebase or merge, bring the base in after asking',
  hint: '[rebase|merge]',
  noGit: 'Not a git repository (or git is not available).',
  noBase: 'No base branch found (origin/HEAD, origin/main or origin/master).',
  onBase: (branch: string) => `You are on the base branch "${branch}". Use git pull.`,
  state: (branch: string, base: string, ahead: number, behind: number) =>
    `${branch} vs ${base}: ${ahead} ahead, ${behind} behind`,
  upToDate: (base: string) => `Already up to date with ${base}.`,
  dirty: 'Uncommitted changes in tracked files. Commit or stash them first (/gst).',
  confirm: (how: string, base: string, behind: number) => `${how} ${behind} new commit(s) from ${base} onto this branch?`,
  rebase: 'Rebase onto',
  merge: 'Merge',
  yes: 'yes',
  no: 'no',
  cancelled: 'Cancelled.',
  done: (how: string, base: string) => `${how} ${base}: done.`,
  failed: (how: string, why: string) => `${how} stopped: ${why}. Resolve it, or run git ${how} --abort.`,
  usage: 'Usage: /sync [rebase|merge]',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Faz fetch e mostra a distância da branch para a base; com rebase ou merge, traz a base depois de perguntar',
  hint: '[rebase|merge]',
  noGit: 'Não é um repositório git (ou o git não está disponível).',
  noBase: 'Nenhuma branch base encontrada (origin/HEAD, origin/main ou origin/master).',
  onBase: branch => `Você está na branch base "${branch}". Use git pull.`,
  state: (branch, base, ahead, behind) => `${branch} vs ${base}: ${ahead} à frente, ${behind} atrás`,
  upToDate: base => `Já está em dia com ${base}.`,
  dirty: 'Há mudanças não commitadas em arquivos rastreados. Commite ou guarde antes (/gst).',
  confirm: (how, base, behind) => `${how} ${behind} commit(s) novo(s) de ${base} nesta branch?`,
  rebase: 'Fazer rebase sobre',
  merge: 'Fazer merge de',
  yes: 'sim',
  no: 'não',
  cancelled: 'Cancelado.',
  done: (how, base) => `${how} ${base}: concluído.`,
  failed: (how, why) => `${how} parou: ${why}. Resolva, ou rode git ${how} --abort.`,
  usage: 'Uso: /sync [rebase|merge]',
}

const es: Strings = {
  command: 'Hace fetch y muestra la distancia de la rama a su base; con rebase o merge, trae la base después de preguntar',
  hint: '[rebase|merge]',
  noGit: 'No es un repositorio git (o git no está disponible).',
  noBase: 'No se encontró una rama base (origin/HEAD, origin/main u origin/master).',
  onBase: branch => `Estás en la rama base "${branch}". Usa git pull.`,
  state: (branch, base, ahead, behind) => `${branch} vs ${base}: ${ahead} adelante, ${behind} atrás`,
  upToDate: base => `Ya estás al día con ${base}.`,
  dirty: 'Hay cambios sin commitear en archivos rastreados. Commitea o guarda antes (/gst).',
  confirm: (how, base, behind) => `¿${how} ${behind} commit(s) nuevo(s) de ${base} en esta rama?`,
  rebase: 'Hacer rebase sobre',
  merge: 'Hacer merge de',
  yes: 'sí',
  no: 'no',
  cancelled: 'Cancelado.',
  done: (how, base) => `${how} ${base}: listo.`,
  failed: (how, why) => `${how} se detuvo: ${why}. Resuélvelo, o ejecuta git ${how} --abort.`,
  usage: 'Uso: /sync [rebase|merge]',
}

export const STRINGS = { en, pt, es }
