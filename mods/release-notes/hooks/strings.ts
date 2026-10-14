const en = {
  command: 'Create a GitHub release with notes from the commits since the last tag, after showing them and asking',
  hint: '[tag]',
  usage: 'Usage: /release [tag]',
  noGit: 'Not a git repository (or git is not available).',
  noGh: 'GitHub CLI (gh) is missing, not signed in, or this is not a GitHub repository.',
  nothing: (tag: string) => `No commits since ${tag}: nothing to release.`,
  exists: (tag: string) => `A release ${tag} already exists.`,
  confirm: (tag: string, commits: number, notes: string) => `Create release ${tag} with ${commits} commit(s)?\n${notes}`,
  yes: 'yes',
  asDraft: 'as draft',
  no: 'no',
  cancelled: 'Cancelled.',
  created: (url: string) => `Release created: ${url}`,
  failed: (why: string) => `gh failed: ${why}`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Cria uma release no GitHub com notas dos commits desde a última tag, depois de mostrá-las e perguntar',
  hint: '[tag]',
  usage: 'Uso: /release [tag]',
  noGit: 'Não é um repositório git (ou o git não está disponível).',
  noGh: 'O GitHub CLI (gh) não está instalado, não está autenticado, ou este não é um repositório do GitHub.',
  nothing: tag => `Nenhum commit desde ${tag}: nada para publicar.`,
  exists: tag => `Já existe uma release ${tag}.`,
  confirm: (tag, commits, notes) => `Criar a release ${tag} com ${commits} commit(s)?\n${notes}`,
  yes: 'sim',
  asDraft: 'como rascunho',
  no: 'não',
  cancelled: 'Cancelado.',
  created: url => `Release criada: ${url}`,
  failed: why => `o gh falhou: ${why}`,
}

const es: Strings = {
  command: 'Crea un release en GitHub con notas de los commits desde la última tag, tras mostrarlas y preguntar',
  hint: '[tag]',
  usage: 'Uso: /release [tag]',
  noGit: 'No es un repositorio git (o git no está disponible).',
  noGh: 'GitHub CLI (gh) no está instalado, no ha iniciado sesión, o este no es un repositorio de GitHub.',
  nothing: tag => `Ningún commit desde ${tag}: nada que publicar.`,
  exists: tag => `Ya existe un release ${tag}.`,
  confirm: (tag, commits, notes) => `¿Crear el release ${tag} con ${commits} commit(s)?\n${notes}`,
  yes: 'sí',
  asDraft: 'como borrador',
  no: 'no',
  cancelled: 'Cancelado.',
  created: url => `Release creado: ${url}`,
  failed: why => `gh falló: ${why}`,
}

export const STRINGS = { en, pt, es }
