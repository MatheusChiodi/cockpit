const en = {
  drink: 'A glass of water now? You have been at it for an hour.',
}

type Strings = typeof en

const pt: Strings = {
  drink: 'Que tal um copo de água agora? Faz uma hora que você está nisso.',
}

const es: Strings = {
  drink: '¿Un vaso de agua ahora? Llevas una hora en esto.',
}

export const STRINGS = { en, pt, es }
