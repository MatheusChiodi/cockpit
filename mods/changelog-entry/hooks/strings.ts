const en = {
  command: 'Write the entry for the next version into CHANGELOG.md from the commits since the last tag, after asking',
  hint: '[version]',
  usage: 'Usage: /changelog [version]',
  noGit: 'Not a git repository (or git is not available).',
  nothing: (tag: string) => `No commits since ${tag}: nothing to add.`,
  exists: (version: string) => `CHANGELOG.md already has an entry for ${version}.`,
  confirm: (entry: string) => `Add to CHANGELOG.md?\n${entry}`,
  yes: 'yes',
  no: 'no',
  cancelled: 'Cancelled.',
  added: (version: string) => `CHANGELOG.md now has the entry for ${version}.`,
  failed: 'Could not write CHANGELOG.md.',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Escreve no CHANGELOG.md a entrada da próxima versão a partir dos commits desde a última tag, depois de perguntar',
  hint: '[versão]',
  usage: 'Uso: /changelog [versão]',
  noGit: 'Não é um repositório git (ou o git não está disponível).',
  nothing: tag => `Nenhum commit desde ${tag}: nada para adicionar.`,
  exists: version => `O CHANGELOG.md já tem uma entrada para ${version}.`,
  confirm: entry => `Adicionar ao CHANGELOG.md?\n${entry}`,
  yes: 'sim',
  no: 'não',
  cancelled: 'Cancelado.',
  added: version => `O CHANGELOG.md agora tem a entrada de ${version}.`,
  failed: 'Não foi possível escrever o CHANGELOG.md.',
}

const es: Strings = {
  command: 'Escribe en CHANGELOG.md la entrada de la próxima versión a partir de los commits desde la última tag, tras preguntar',
  hint: '[versión]',
  usage: 'Uso: /changelog [versión]',
  noGit: 'No es un repositorio git (o git no está disponible).',
  nothing: tag => `Ningún commit desde ${tag}: nada que agregar.`,
  exists: version => `CHANGELOG.md ya tiene una entrada para ${version}.`,
  confirm: entry => `¿Agregar a CHANGELOG.md?\n${entry}`,
  yes: 'sí',
  no: 'no',
  cancelled: 'Cancelado.',
  added: version => `CHANGELOG.md ahora tiene la entrada de ${version}.`,
  failed: 'No se pudo escribir CHANGELOG.md.',
}

export const STRINGS = { en, pt, es }
