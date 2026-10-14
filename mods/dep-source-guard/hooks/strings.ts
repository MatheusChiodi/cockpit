const en = {
  failed: 'dep-source-guard: the check failed, confirm before continuing.',
  remote: (where: string) =>
    `dep-source-guard: pins a dependency to a git URL or tarball (${where}). The version is not reproducible and skips the registry checks; publish it to a registry, or pin an exact commit and keep the lockfile.`,
  http: (where: string) =>
    `dep-source-guard: pulls a dependency over plain http (${where}). The download can be tampered with in transit; use an https source.`,
}

type Strings = typeof en

const pt: Strings = {
  failed: 'dep-source-guard: a verificação falhou, confirme antes de continuar.',
  remote: where =>
    `dep-source-guard: fixa uma dependência em uma URL git ou tarball (${where}). A versão não é reproduzível e pula as checagens do registry; publique em um registry ou fixe um commit exato e mantenha o lockfile.`,
  http: where =>
    `dep-source-guard: baixa uma dependência por http puro (${where}). O download pode ser adulterado no caminho; use uma fonte https.`,
}

const es: Strings = {
  failed: 'dep-source-guard: la verificación falló, confirma antes de continuar.',
  remote: where =>
    `dep-source-guard: fija una dependencia a una URL git o tarball (${where}). La versión no es reproducible y omite los controles del registry; publícala en un registry o fija un commit exacto y conserva el lockfile.`,
  http: where =>
    `dep-source-guard: descarga una dependencia por http plano (${where}). La descarga puede ser alterada en tránsito; usa una fuente https.`,
}

export type What = 'remote' | 'http'

export const STRINGS = { en, pt, es }
