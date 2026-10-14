const en = {
  scattered: (files: number, areas: number) =>
    `${files} files across ${areas} unrelated folders in one turn. Worth splitting into separate changes.`,
}

type Strings = typeof en

const pt: Strings = {
  scattered: (files, areas) =>
    `${files} arquivos em ${areas} pastas sem relação num só turno. Vale separar em mudanças distintas.`,
}

const es: Strings = {
  scattered: (files, areas) =>
    `${files} archivos en ${areas} carpetas sin relación en un solo turno. Conviene separarlo en cambios distintos.`,
}

export const STRINGS = { en, pt, es }
