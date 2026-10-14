const en = {
  behind: (count: number, base: string, branch: string) =>
    `${branch} is ${count} commits behind ${base}. Sync soon (/sync) before the conflicts grow.`,
}

type Strings = typeof en

const pt: Strings = {
  behind: (count, base, branch) =>
    `${branch} está ${count} commits atrás de ${base}. Sincronize logo (/sync) antes que os conflitos cresçam.`,
}

const es: Strings = {
  behind: (count, base, branch) =>
    `${branch} está ${count} commits detrás de ${base}. Sincroniza pronto (/sync) antes de que los conflictos crezcan.`,
}

export const STRINGS = { en, pt, es }
