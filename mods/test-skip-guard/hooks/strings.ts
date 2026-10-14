const en = {
  blocked: (what: string) =>
    `test-skip-guard blocked the edit: it adds ${what}. A skipped or focused test hides failures; fix the test instead.`,
  failed: 'test-skip-guard: the check failed, edit refused.',
}

type Strings = typeof en

const pt: Strings = {
  blocked: what =>
    `test-skip-guard bloqueou a edição: ela adiciona ${what}. Teste pulado ou focado esconde falhas; corrija o teste.`,
  failed: 'test-skip-guard: a verificação falhou, edição recusada.',
}

const es: Strings = {
  blocked: what =>
    `test-skip-guard bloqueó la edición: añade ${what}. Un test omitido o enfocado oculta fallos; corrige el test.`,
  failed: 'test-skip-guard: la verificación falló, edición rechazada.',
}

export const STRINGS = { en, pt, es }
