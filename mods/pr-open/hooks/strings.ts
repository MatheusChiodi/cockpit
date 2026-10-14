const en = {
  command: 'Open a pull request from the current branch with a title and body built from its commits, after asking',
  hint: '[title]',
  noGh: 'GitHub CLI (gh) is missing, not signed in, or this is not a GitHub repository.',
  onBase: (branch: string) => `You are on ${branch}, the base branch: switch to a feature branch first.`,
  noCommits: (base: string) => `No commits ahead of ${base}: nothing to open a pull request for.`,
  pushFirst: (branch: string) => `Push the branch first: git push -u origin ${branch}`,
  exists: (number: number, url: string) => `Pull request #${number} already exists: ${url}`,
  confirm: (title: string, base: string, commits: number) => `Open a pull request "${title}" into ${base} with ${commits} commit(s)?`,
  yes: 'yes',
  asDraft: 'as draft',
  no: 'no',
  cancelled: 'Cancelled.',
  created: (url: string) => `Pull request opened: ${url}`,
  failed: (why: string) => `gh failed: ${why}`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Abre um pull request da branch atual com título e corpo montados a partir dos commits, depois de perguntar',
  hint: '[título]',
  noGh: 'O GitHub CLI (gh) não está instalado, não está autenticado, ou este não é um repositório do GitHub.',
  onBase: branch => `Você está em ${branch}, a branch base: mude para uma branch de trabalho primeiro.`,
  noCommits: base => `Nenhum commit à frente de ${base}: nada para abrir um pull request.`,
  pushFirst: branch => `Envie a branch primeiro: git push -u origin ${branch}`,
  exists: (number, url) => `O pull request #${number} já existe: ${url}`,
  confirm: (title, base, commits) => `Abrir o pull request "${title}" em ${base} com ${commits} commit(s)?`,
  yes: 'sim',
  asDraft: 'como rascunho',
  no: 'não',
  cancelled: 'Cancelado.',
  created: url => `Pull request aberto: ${url}`,
  failed: why => `o gh falhou: ${why}`,
}

const es: Strings = {
  command: 'Abre un pull request de la rama actual con título y cuerpo armados a partir de los commits, tras preguntar',
  hint: '[título]',
  noGh: 'GitHub CLI (gh) no está instalado, no ha iniciado sesión, o este no es un repositorio de GitHub.',
  onBase: branch => `Estás en ${branch}, la rama base: cambia primero a una rama de trabajo.`,
  noCommits: base => `Ningún commit por delante de ${base}: nada para abrir un pull request.`,
  pushFirst: branch => `Sube la rama primero: git push -u origin ${branch}`,
  exists: (number, url) => `El pull request #${number} ya existe: ${url}`,
  confirm: (title, base, commits) => `¿Abrir el pull request "${title}" en ${base} con ${commits} commit(s)?`,
  yes: 'sí',
  asDraft: 'como borrador',
  no: 'no',
  cancelled: 'Cancelado.',
  created: url => `Pull request abierto: ${url}`,
  failed: why => `gh falló: ${why}`,
}

export const STRINGS = { en, pt, es }
