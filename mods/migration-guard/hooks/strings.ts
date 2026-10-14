const en = {
  blocked: (path: string) =>
    `migration-guard blocked the edit: ${path} is an existing migration, and applied migrations are append-only. Add a new migration file instead.`,
  failed: 'migration-guard: the check failed, edit refused.',
}

type Strings = typeof en

const pt: Strings = {
  blocked: path =>
    `migration-guard bloqueou a edição: ${path} é uma migration existente, e migrations já aplicadas só recebem acréscimos. Crie um novo arquivo de migration.`,
  failed: 'migration-guard: a verificação falhou, edição recusada.',
}

const es: Strings = {
  blocked: path =>
    `migration-guard bloqueó la edición: ${path} es una migración existente, y las migraciones ya aplicadas solo admiten añadidos. Crea un archivo de migración nuevo.`,
  failed: 'migration-guard: la verificación falló, edición rechazada.',
}

export const STRINGS = { en, pt, es }
