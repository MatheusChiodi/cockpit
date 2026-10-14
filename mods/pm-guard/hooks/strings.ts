const en = {
  denied: (pm: string, source: string, used: string, suggest: string) =>
    `pm-guard: this project uses ${pm} (${source}); "${used}" would write another lockfile. Run "${suggest}".`,
  failed: 'pm-guard: the check failed, run the command with the same package manager as the lockfile.',
}

type Strings = typeof en

const pt: Strings = {
  denied: (pm, source, used, suggest) =>
    `pm-guard: este projeto usa ${pm} (${source}); "${used}" geraria outro lockfile. Rode "${suggest}".`,
  failed: 'pm-guard: a verificação falhou, rode o comando com o mesmo gerenciador do lockfile.',
}

const es: Strings = {
  denied: (pm, source, used, suggest) =>
    `pm-guard: este proyecto usa ${pm} (${source}); "${used}" generaría otro lockfile. Ejecuta "${suggest}".`,
  failed: 'pm-guard: la verificación falló, ejecuta el comando con el mismo gestor del lockfile.',
}

export const STRINGS = { en, pt, es }
