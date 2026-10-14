const en = {
  command: 'Show the latest tag and what came after it, or tag the next patch, minor or major version after asking',
  hint: '[patch|minor|major]',
  usage: 'Usage: /gtag [patch|minor|major]',
  noGit: 'Not a git repository (or git is not available).',
  noTags: 'No tags yet. Next: /gtag patch creates v0.0.1.',
  summary: (tag: string, commits: number) => `Latest tag ${tag}, ${commits} commit(s) since`,
  notSemver: (tag: string) => `Latest tag "${tag}" is not vMAJOR.MINOR.PATCH; tag it by hand.`,
  alreadyTagged: (tag: string) => `HEAD is already tagged ${tag}.`,
  confirm: (tag: string, commit: string) => `Create annotated tag ${tag} on "${commit}"?`,
  yes: 'yes',
  no: 'no',
  cancelled: 'Cancelled.',
  created: (tag: string) => `Tag ${tag} created. Publish it with: git push origin ${tag}`,
  failed: (why: string) => `git failed: ${why}`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Mostra a última tag e o que veio depois, ou cria a tag da próxima versão patch, minor ou major depois de perguntar',
  hint: '[patch|minor|major]',
  usage: 'Uso: /gtag [patch|minor|major]',
  noGit: 'Não é um repositório git (ou o git não está disponível).',
  noTags: 'Ainda não há tags. Próxima: /gtag patch cria v0.0.1.',
  summary: (tag, commits) => `Última tag ${tag}, ${commits} commit(s) depois`,
  notSemver: tag => `A última tag "${tag}" não é vMAJOR.MINOR.PATCH; crie a tag à mão.`,
  alreadyTagged: tag => `O HEAD já tem a tag ${tag}.`,
  confirm: (tag, commit) => `Criar a tag anotada ${tag} em "${commit}"?`,
  yes: 'sim',
  no: 'não',
  cancelled: 'Cancelado.',
  created: tag => `Tag ${tag} criada. Publique com: git push origin ${tag}`,
  failed: why => `o git falhou: ${why}`,
}

const es: Strings = {
  command: 'Muestra la última tag y lo que vino después, o crea la tag de la próxima versión patch, minor o major tras preguntar',
  hint: '[patch|minor|major]',
  usage: 'Uso: /gtag [patch|minor|major]',
  noGit: 'No es un repositorio git (o git no está disponible).',
  noTags: 'Aún no hay tags. Próxima: /gtag patch crea v0.0.1.',
  summary: (tag, commits) => `Última tag ${tag}, ${commits} commit(s) después`,
  notSemver: tag => `La última tag "${tag}" no es vMAJOR.MINOR.PATCH; créala a mano.`,
  alreadyTagged: tag => `HEAD ya tiene la tag ${tag}.`,
  confirm: (tag, commit) => `¿Crear la tag anotada ${tag} en "${commit}"?`,
  yes: 'sí',
  no: 'no',
  cancelled: 'Cancelado.',
  created: tag => `Tag ${tag} creada. Publícala con: git push origin ${tag}`,
  failed: why => `git falló: ${why}`,
}

export const STRINGS = { en, pt, es }
