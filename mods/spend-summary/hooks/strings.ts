const en = {
  title: 'Claude Code',
  summary: (usd: string, turns: number, time: string, each: string) =>
    `Session spend US$ ${usd} over ${time}, ${turns} ${turns === 1 ? 'turn' : 'turns'} (US$ ${each} each)`,
}

type Strings = typeof en

const pt: Strings = {
  title: 'Claude Code',
  summary: (usd, turns, time, each) =>
    `Gasto da sessão US$ ${usd} em ${time}, ${turns} ${turns === 1 ? 'turno' : 'turnos'} (US$ ${each} cada)`,
}

const es: Strings = {
  title: 'Claude Code',
  summary: (usd, turns, time, each) =>
    `Gasto de la sesión US$ ${usd} en ${time}, ${turns} ${turns === 1 ? 'turno' : 'turnos'} (US$ ${each} cada uno)`,
}

export const STRINGS = { en, pt, es }
