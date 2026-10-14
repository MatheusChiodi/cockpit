const en = {
  confirm: (files: number, lines: number) =>
    `commit-review: ${files} file(s), ${lines} changed line(s) staged. Review the diff, then confirm to commit.`,
  failed: 'commit-review: the check failed, confirm before committing.',
}

type Strings = typeof en

const pt: Strings = {
  confirm: (files, lines) =>
    `commit-review: ${files} arquivo(s), ${lines} linha(s) alteradas no stage. Revise o diff e confirme para commitar.`,
  failed: 'commit-review: a verificação falhou, confirme antes de commitar.',
}

const es: Strings = {
  confirm: (files, lines) =>
    `commit-review: ${files} archivo(s), ${lines} línea(s) cambiadas en el stage. Revisa el diff y confirma para commitear.`,
  failed: 'commit-review: la verificación falló, confirma antes de commitear.',
}

export const STRINGS = { en, pt, es }
