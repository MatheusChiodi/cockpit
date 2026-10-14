const en = {
  blocked: (lines: number, start: string) =>
    `dup-block-guard blocked the edit: it repeats ${lines} lines already in this file (from "${start}"). Extract a function instead.`,
  failed: 'dup-block-guard: the check failed, edit refused.',
}

type Strings = typeof en

const pt: Strings = {
  blocked: (lines, start) =>
    `dup-block-guard bloqueou a edição: ela repete ${lines} linhas que já estão neste arquivo (a partir de "${start}"). Extraia uma função.`,
  failed: 'dup-block-guard: a verificação falhou, edição recusada.',
}

const es: Strings = {
  blocked: (lines, start) =>
    `dup-block-guard bloqueó la edición: repite ${lines} líneas que ya están en este archivo (desde "${start}"). Extrae una función.`,
  failed: 'dup-block-guard: la verificación falló, edición rechazada.',
}

export const STRINGS = { en, pt, es }
