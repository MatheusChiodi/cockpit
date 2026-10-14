const en = {
  command: 'List the review comments on your pull request that you have not answered yet',
  noGh: 'GitHub CLI (gh) is missing, not signed in, or there is no pull request on this branch.',
  none: (number: number) => `PR #${number}  no review comments waiting for you`,
  head: (number: number, count: number) => `PR #${number}  ${count} comment(s) waiting for you`,
  more: (count: number) => `  … and ${count} more`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Lista os comentários de revisão do seu pull request que você ainda não respondeu',
  noGh: 'O GitHub CLI (gh) não está instalado, não está autenticado, ou não há pull request nesta branch.',
  none: number => `PR #${number}  nenhum comentário de revisão esperando você`,
  head: (number, count) => `PR #${number}  ${count} comentário(s) esperando você`,
  more: count => `  … e mais ${count}`,
}

const es: Strings = {
  command: 'Lista los comentarios de revisión de tu pull request que aún no respondiste',
  noGh: 'GitHub CLI (gh) no está instalado, no ha iniciado sesión, o no hay pull request en esta rama.',
  none: number => `PR #${number}  ningún comentario de revisión esperándote`,
  head: (number, count) => `PR #${number}  ${count} comentario(s) esperándote`,
  more: count => `  … y ${count} más`,
}

export const STRINGS = { en, pt, es }
