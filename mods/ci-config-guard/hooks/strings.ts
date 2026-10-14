const en = {
  ask: (path: string) => `ci-config-guard: ${path} configures the pipeline or deploy. Confirm the edit.`,
  failed: 'ci-config-guard: the check failed, confirm manually.',
}

type Strings = typeof en

const pt: Strings = {
  ask: path => `ci-config-guard: ${path} configura o pipeline ou o deploy. Confirme a edição.`,
  failed: 'ci-config-guard: a verificação falhou, confirme manualmente.',
}

const es: Strings = {
  ask: path => `ci-config-guard: ${path} configura el pipeline o el deploy. Confirma la edición.`,
  failed: 'ci-config-guard: la verificación falló, confirma manualmente.',
}

export const STRINGS = { en, pt, es }
