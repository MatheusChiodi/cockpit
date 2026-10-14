const en = {
  command: 'Add "Closes #N" to the current pull request so the issue closes when it merges, after asking',
  hint: '<issue number>',
  usage: 'Usage: /closes <issue number>',
  noGh: 'GitHub CLI (gh) is missing, not signed in, or there is no pull request on this branch.',
  noIssue: (issue: number) => `Issue #${issue} was not found in this repository.`,
  already: (number: number, issue: number) => `PR #${number} already closes #${issue}.`,
  confirm: (issue: number, title: string, number: number) => `Add "Closes #${issue}" (${title}) to PR #${number}?`,
  yes: 'yes',
  no: 'no',
  cancelled: 'Cancelled.',
  linked: (number: number, issue: number) => `PR #${number} now closes #${issue} when it merges.`,
  failed: (why: string) => `gh failed: ${why}`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Adiciona "Closes #N" ao pull request atual para a issue fechar quando ele for mesclado, depois de perguntar',
  hint: '<número da issue>',
  usage: 'Uso: /closes <número da issue>',
  noGh: 'O GitHub CLI (gh) não está instalado, não está autenticado, ou não há pull request nesta branch.',
  noIssue: issue => `A issue #${issue} não foi encontrada neste repositório.`,
  already: (number, issue) => `O PR #${number} já fecha a #${issue}.`,
  confirm: (issue, title, number) => `Adicionar "Closes #${issue}" (${title}) ao PR #${number}?`,
  yes: 'sim',
  no: 'não',
  cancelled: 'Cancelado.',
  linked: (number, issue) => `O PR #${number} agora fecha a #${issue} quando for mesclado.`,
  failed: why => `o gh falhou: ${why}`,
}

const es: Strings = {
  command: 'Agrega "Closes #N" al pull request actual para que el issue cierre al fusionarlo, tras preguntar',
  hint: '<número del issue>',
  usage: 'Uso: /closes <número del issue>',
  noGh: 'GitHub CLI (gh) no está instalado, no ha iniciado sesión, o no hay pull request en esta rama.',
  noIssue: issue => `El issue #${issue} no se encontró en este repositorio.`,
  already: (number, issue) => `El PR #${number} ya cierra el #${issue}.`,
  confirm: (issue, title, number) => `¿Agregar "Closes #${issue}" (${title}) al PR #${number}?`,
  yes: 'sí',
  no: 'no',
  cancelled: 'Cancelado.',
  linked: (number, issue) => `El PR #${number} ahora cierra el #${issue} al fusionarse.`,
  failed: why => `gh falló: ${why}`,
}

export const STRINGS = { en, pt, es }
