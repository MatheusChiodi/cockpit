const en = {
  jump: (points: number, percent: number, tool: string) =>
    `Context +${points} points in one step (${percent}%). Last tool: ${tool}`,
  unknown: 'none',
}

type Strings = typeof en

const pt: Strings = {
  jump: (points, percent, tool) =>
    `Contexto +${points} pontos de uma vez (${percent}%). Última ferramenta: ${tool}`,
  unknown: 'nenhuma',
}

const es: Strings = {
  jump: (points, percent, tool) =>
    `Contexto +${points} puntos de golpe (${percent}%). Última herramienta: ${tool}`,
  unknown: 'ninguna',
}

export const STRINGS = { en, pt, es }
