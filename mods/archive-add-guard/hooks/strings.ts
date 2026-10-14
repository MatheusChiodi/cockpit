const en = {
  failed: 'archive-add-guard: the check failed, confirm before continuing.',
  binary: (detail: string) =>
    `archive-add-guard: git add of a binary or archive (${detail}). It stays in the history forever and weighs on every clone; ignore it in .gitignore, or use Git LFS or a release asset.`,
  large: (detail: string, mb: string) =>
    `archive-add-guard: git add of ${detail}, ${mb} MB. It stays in the history forever and weighs on every clone; ignore it in .gitignore, or use Git LFS or a release asset.`,
}

type Strings = typeof en

const pt: Strings = {
  failed: 'archive-add-guard: a verificação falhou, confirme antes de continuar.',
  binary: detail =>
    `archive-add-guard: git add de um binário ou arquivo compactado (${detail}). Ele fica no histórico para sempre e pesa em todo clone; ignore no .gitignore ou use Git LFS ou um asset de release.`,
  large: (detail, mb) =>
    `archive-add-guard: git add de ${detail}, ${mb} MB. Ele fica no histórico para sempre e pesa em todo clone; ignore no .gitignore ou use Git LFS ou um asset de release.`,
}

const es: Strings = {
  failed: 'archive-add-guard: la verificación falló, confirma antes de continuar.',
  binary: detail =>
    `archive-add-guard: git add de un binario o archivo comprimido (${detail}). Queda en el historial para siempre y pesa en cada clon; ignóralo en .gitignore o usa Git LFS o un asset de release.`,
  large: (detail, mb) =>
    `archive-add-guard: git add de ${detail}, ${mb} MB. Queda en el historial para siempre y pesa en cada clon; ignóralo en .gitignore o usa Git LFS o un asset de release.`,
}

export const STRINGS = { en, pt, es }
