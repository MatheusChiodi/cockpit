const en = {
  denied: (spec: string, path: string, levels: number, alias: string, suggestion: string) =>
    `alias-import-guard: "${spec}" climbs ${levels} folders in ${path}. tsconfig paths has "${alias}": import "${suggestion}" instead.`,
  failed: 'alias-import-guard: the check failed, prefer the tsconfig path aliases over ../../../ imports.',
}

type Strings = typeof en

const pt: Strings = {
  denied: (spec, path, levels, alias, suggestion) =>
    `alias-import-guard: "${spec}" sobe ${levels} pastas em ${path}. O paths do tsconfig tem "${alias}": importe "${suggestion}".`,
  failed: 'alias-import-guard: a verificação falhou, prefira os aliases de path do tsconfig a imports com ../../../.',
}

const es: Strings = {
  denied: (spec, path, levels, alias, suggestion) =>
    `alias-import-guard: "${spec}" sube ${levels} carpetas en ${path}. El paths de tsconfig tiene "${alias}": importa "${suggestion}".`,
  failed: 'alias-import-guard: la verificación falló, prefiere los alias de path de tsconfig a imports con ../../../.',
}

export const STRINGS = { en, pt, es }
