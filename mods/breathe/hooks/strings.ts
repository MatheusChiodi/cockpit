const en = {
  command: 'One minute of guided breathing through toasts: in 4, hold 4, out 6, five rounds',
  started: (rounds: number) => `Breathing, ${rounds} rounds. Settle in.`,
  phase: (phase: 'in' | 'hold' | 'out', seconds: number, round: number, rounds: number) =>
    `${phase === 'in' ? 'Breathe in' : phase === 'hold' ? 'Hold' : 'Breathe out'}… ${seconds}  (${round}/${rounds})`,
  done: 'Done. Back to it, slowly.',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Um minuto de respiração guiada por toasts: inspire 4, segure 4, expire 6, cinco rodadas',
  started: rounds => `Respirando, ${rounds} rodadas. Acomode-se.`,
  phase: (phase, seconds, round, rounds) =>
    `${phase === 'in' ? 'Inspire' : phase === 'hold' ? 'Segure' : 'Expire'}… ${seconds}  (${round}/${rounds})`,
  done: 'Pronto. Volte com calma.',
}

const es: Strings = {
  command: 'Un minuto de respiración guiada con toasts: inhala 4, sostén 4, exhala 6, cinco rondas',
  started: rounds => `Respirando, ${rounds} rondas. Ponte cómodo.`,
  phase: (phase, seconds, round, rounds) =>
    `${phase === 'in' ? 'Inhala' : phase === 'hold' ? 'Sostén' : 'Exhala'}… ${seconds}  (${round}/${rounds})`,
  done: 'Listo. Vuelve con calma.',
}

export const STRINGS = { en, pt, es }
