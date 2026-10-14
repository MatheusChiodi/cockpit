const en = {
  confirm: 'snapshot-update-guard: rewrites the expected snapshots, which can bless a regression. Confirm before running.',
  failed: 'snapshot-update-guard: the check failed, confirm before running.',
}

type Strings = typeof en

const pt: Strings = {
  confirm: 'snapshot-update-guard: reescreve os snapshots esperados, o que pode aprovar uma regressão. Confirme antes de executar.',
  failed: 'snapshot-update-guard: a verificação falhou, confirme antes de executar.',
}

const es: Strings = {
  confirm: 'snapshot-update-guard: reescribe los snapshots esperados, lo que puede aprobar una regresión. Confirma antes de ejecutar.',
  failed: 'snapshot-update-guard: la verificación falló, confirma antes de ejecutar.',
}

export const STRINGS = { en, pt, es }
