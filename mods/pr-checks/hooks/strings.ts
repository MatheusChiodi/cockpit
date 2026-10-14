const en = {
  command: 'Show the checks of the current pull request and which ones failed',
  noGh: 'GitHub CLI (gh) is missing, not signed in, or there is no pull request on this branch.',
  noChecks: (number: number) => `PR #${number}  no checks reported`,
  head: (number: number, passed: number, failed: number, pending: number) =>
    `PR #${number}  ✓ ${passed} passed  ✗ ${failed} failed  … ${pending} running`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Mostra os checks do pull request atual e quais falharam',
  noGh: 'O GitHub CLI (gh) não está instalado, não está autenticado, ou não há pull request nesta branch.',
  noChecks: number => `PR #${number}  nenhum check reportado`,
  head: (number, passed, failed, pending) =>
    `PR #${number}  ✓ ${passed} passaram  ✗ ${failed} falharam  … ${pending} em andamento`,
}

const es: Strings = {
  command: 'Muestra los checks del pull request actual y cuáles fallaron',
  noGh: 'GitHub CLI (gh) no está instalado, no ha iniciado sesión, o no hay pull request en esta rama.',
  noChecks: number => `PR #${number}  ningún check reportado`,
  head: (number, passed, failed, pending) =>
    `PR #${number}  ✓ ${passed} pasaron  ✗ ${failed} fallaron  … ${pending} en curso`,
}

export const STRINGS = { en, pt, es }
