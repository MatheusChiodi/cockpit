const en = {
  toast: (from: string, to: string) => `Session moved from ${from} to ${to}, a pricier model: each turn now costs more`,
}

type Strings = typeof en

const pt: Strings = {
  toast: (from, to) => `A sessão passou de ${from} para ${to}, um modelo mais caro: cada turno agora custa mais`,
}

const es: Strings = {
  toast: (from, to) => `La sesión pasó de ${from} a ${to}, un modelo más caro: cada turno ahora cuesta más`,
}

export const STRINGS = { en, pt, es }
