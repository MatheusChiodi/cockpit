const en = {
  title: 'Claude Code',
  error: 'The turn ended with an error.',
  refusal: 'The model refused the request.',
}

type Strings = typeof en

const pt: Strings = {
  title: 'Claude Code',
  error: 'O turno terminou com erro.',
  refusal: 'O modelo recusou o pedido.',
}

const es: Strings = {
  title: 'Claude Code',
  error: 'El turno terminó con un error.',
  refusal: 'El modelo rechazó la solicitud.',
}

export const STRINGS = { en, pt, es }
