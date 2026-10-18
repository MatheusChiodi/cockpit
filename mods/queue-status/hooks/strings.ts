const en = {
  label: 'queue',
  waiting: (count: number) => (count === 1 ? '1 prompt waiting' : `${count} prompts waiting`),
}

type Strings = typeof en

const pt: Strings = {
  label: 'fila',
  waiting: count => (count === 1 ? '1 prompt esperando' : `${count} prompts esperando`),
}

const es: Strings = {
  label: 'cola',
  waiting: count => (count === 1 ? '1 prompt esperando' : `${count} prompts esperando`),
}

export const STRINGS = { en, pt, es }
