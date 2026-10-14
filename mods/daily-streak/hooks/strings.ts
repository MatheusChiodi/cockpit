const en = {
  command: 'Shows your streak of days using Claude Code',
  line: (count: number, best: number) => `◆ ${count} day${count === 1 ? '' : 's'} in a row with Claude Code (best: ${best})`,
  none: 'No streak started yet.',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Mostra sua sequência de dias usando o Claude Code',
  line: (count, best) => `◆ ${count} dia${count === 1 ? '' : 's'} seguido${count === 1 ? '' : 's'} de Claude Code (recorde: ${best})`,
  none: 'Sequência ainda não iniciada.',
}

const es: Strings = {
  command: 'Muestra tu racha de días usando Claude Code',
  line: (count, best) => `◆ ${count} día${count === 1 ? '' : 's'} seguido${count === 1 ? '' : 's'} con Claude Code (récord: ${best})`,
  none: 'Aún no has empezado una racha.',
}

export const STRINGS = { en, pt, es }
