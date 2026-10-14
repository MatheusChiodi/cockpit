const en = {
  confirm: (what: string) => `any-guard: the edit adds ${what}, which turns type checking off. Confirm before running.`,
  failed: 'any-guard: the check failed, confirm before running.',
}

type Strings = typeof en

const pt: Strings = {
  confirm: what => `any-guard: a edição adiciona ${what}, o que desliga a checagem de tipos. Confirme antes de executar.`,
  failed: 'any-guard: a verificação falhou, confirme antes de executar.',
}

const es: Strings = {
  confirm: what => `any-guard: la edición añade ${what}, lo que desactiva la comprobación de tipos. Confirma antes de ejecutar.`,
  failed: 'any-guard: la verificación falló, confirma antes de ejecutar.',
}

export const STRINGS = { en, pt, es }
