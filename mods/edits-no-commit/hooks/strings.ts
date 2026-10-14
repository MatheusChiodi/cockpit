const en = {
  edits: (edits: number, spent: string) => `${edits} edits and ${spent} without a commit. A good moment to save a checkpoint.`,
}

type Strings = typeof en

const pt: Strings = {
  edits: (edits, spent) => `${edits} edições e ${spent} sem commit. Bom momento para salvar um ponto de retorno.`,
}

const es: Strings = {
  edits: (edits, spent) => `${edits} ediciones y ${spent} sin commit. Buen momento para guardar un punto de retorno.`,
}

export const STRINGS = { en, pt, es }
