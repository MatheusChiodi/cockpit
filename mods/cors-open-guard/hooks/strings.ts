const en = {
  failed: 'cors-open-guard: the check failed, confirm before continuing.',
  open: (where: string) =>
    `cors-open-guard: opens CORS to every origin in ${where}. Any website can then call this API from a visitor's browser; list the origins that need access instead of using *.`,
}

type Strings = typeof en

const pt: Strings = {
  failed: 'cors-open-guard: a verificação falhou, confirme antes de continuar.',
  open: where =>
    `cors-open-guard: abre o CORS para qualquer origem em ${where}. Qualquer site passa a chamar esta API pelo navegador do visitante; liste as origens que precisam de acesso em vez de usar *.`,
}

const es: Strings = {
  failed: 'cors-open-guard: la verificación falló, confirma antes de continuar.',
  open: where =>
    `cors-open-guard: abre CORS a cualquier origen en ${where}. Cualquier sitio podrá llamar a esta API desde el navegador del visitante; lista los orígenes que necesitan acceso en lugar de usar *.`,
}

export type What = 'open'

export const STRINGS = { en, pt, es }
