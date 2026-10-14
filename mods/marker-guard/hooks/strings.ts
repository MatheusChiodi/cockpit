const en = {
  blocked: (files: string) =>
    `marker-guard refused the commit: unresolved conflict markers in ${files}. Resolve them, stage again, then commit.`,
  failed: 'marker-guard: the check failed, command refused.',
}

type Strings = typeof en

const pt: Strings = {
  blocked: files =>
    `marker-guard recusou o commit: marcadores de conflito sem resolver em ${files}. Resolva, faça o stage de novo e commite.`,
  failed: 'marker-guard: a verificação falhou, comando recusado.',
}

const es: Strings = {
  blocked: files =>
    `marker-guard rechazó el commit: marcadores de conflicto sin resolver en ${files}. Resuélvelos, haz el stage de nuevo y commitea.`,
  failed: 'marker-guard: la verificación falló, comando rechazado.',
}

export const STRINGS = { en, pt, es }
