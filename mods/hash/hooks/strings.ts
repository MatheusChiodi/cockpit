const en = {
  command: 'SHA-256 and SHA-1 of a text, in hex; uses the mouse selection when no text is given',
  hint: '<text>',
  usage: 'Usage: /hash <text>',
  copied: 'SHA-256 copied to the clipboard.',
}

type Strings = typeof en

const pt: Strings = {
  command: 'SHA-256 e SHA-1 de um texto, em hexadecimal; usa a seleção do mouse quando não há texto',
  hint: '<texto>',
  usage: 'Uso: /hash <texto>',
  copied: 'SHA-256 copiado para a área de transferência.',
}

const es: Strings = {
  command: 'SHA-256 y SHA-1 de un texto, en hexadecimal; usa la selección del ratón cuando no hay texto',
  hint: '<texto>',
  usage: 'Uso: /hash <texto>',
  copied: 'SHA-256 copiado al portapapeles.',
}

export const STRINGS = { en, pt, es }
