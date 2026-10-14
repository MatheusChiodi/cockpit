const en = {
  blocked: 'empty-test-guard blocked the edit: it adds test cases with no assertion. A test that asserts nothing always passes; add the expect or assert.',
  failed: 'empty-test-guard: the check failed, edit refused.',
}

type Strings = typeof en

const pt: Strings = {
  blocked: 'empty-test-guard bloqueou a edição: ela adiciona casos de teste sem nenhuma asserção. Teste que não verifica nada sempre passa; adicione o expect ou assert.',
  failed: 'empty-test-guard: a verificação falhou, edição recusada.',
}

const es: Strings = {
  blocked: 'empty-test-guard bloqueó la edición: añade casos de test sin ninguna aserción. Un test que no verifica nada siempre pasa; añade el expect o assert.',
  failed: 'empty-test-guard: la verificación falló, edición rechazada.',
}

export const STRINGS = { en, pt, es }
