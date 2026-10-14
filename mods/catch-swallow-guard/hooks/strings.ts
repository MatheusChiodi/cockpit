const en = {
  blocked: (what: string) =>
    `catch-swallow-guard blocked the edit: it adds ${what}. Swallowed errors hide failures; handle, log or rethrow.`,
  empty: 'an empty catch block',
  pass: 'an except that only passes',
  failed: 'catch-swallow-guard: the check failed, edit refused.',
}

type Strings = typeof en

const pt: Strings = {
  blocked: what =>
    `catch-swallow-guard bloqueou a edição: ela adiciona ${what}. Erro engolido esconde falhas; trate, registre ou relance.`,
  empty: 'um bloco catch vazio',
  pass: 'um except que só faz pass',
  failed: 'catch-swallow-guard: a verificação falhou, edição recusada.',
}

const es: Strings = {
  blocked: what =>
    `catch-swallow-guard bloqueó la edición: añade ${what}. Un error tragado oculta fallos; trátalo, regístralo o relánzalo.`,
  empty: 'un bloque catch vacío',
  pass: 'un except que solo hace pass',
  failed: 'catch-swallow-guard: la verificación falló, edición rechazada.',
}

export const STRINGS = { en, pt, es }
