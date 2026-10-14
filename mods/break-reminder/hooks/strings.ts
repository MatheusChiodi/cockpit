const en = {
  session: (minutes: number) => `${minutes} min of session.`,
  tips: [
    'Stand up, stretch and drink some water.',
    'Look far away for 20 seconds: the 20-20-20 rule.',
    'A quick walk helps more than one more prompt.',
    'Shoulders down, take three deep breaths.',
  ],
}

type Strings = typeof en

const pt: Strings = {
  session: minutes => `${minutes} min de sessão.`,
  tips: [
    'Levante, alongue e beba água.',
    'Olhe para longe por 20 segundos: regra 20-20-20.',
    'Uma volta rápida ajuda mais que mais um prompt.',
    'Ombros para baixo, respire fundo três vezes.',
  ],
}

const es: Strings = {
  session: minutes => `${minutes} min de sesión.`,
  tips: [
    'Levántate, estírate y toma agua.',
    'Mira a lo lejos durante 20 segundos: regla 20-20-20.',
    'Un paseo corto ayuda más que otro prompt.',
    'Hombros abajo, respira hondo tres veces.',
  ],
}

export const STRINGS = { en, pt, es }
