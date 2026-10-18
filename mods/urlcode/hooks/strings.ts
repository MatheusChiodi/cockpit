const en = {
  command: 'URL-encode or decode text and copy it (uses the mouse selection when no text is given)',
  hint: '[encode|decode] [text]',
  usage: 'Usage: /url [encode|decode] <text>  (without a word, text with %XX is decoded, anything else is encoded)',
  badPercent: (at: number) => `Cannot decode: "%" at position ${at} is not followed by two hex digits.`,
  badBytes: (at: number) => `Cannot decode: the bytes near position ${at} are not valid UTF-8.`,
  encoded: 'Encoded.',
  decoded: 'Decoded.',
  copied: 'Copied to the clipboard.',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Codifica ou decodifica texto para URL e copia (usa a seleção do mouse quando não há texto)',
  hint: '[encode|decode] [texto]',
  usage: 'Uso: /url [encode|decode] <texto>  (sem a palavra, texto com %XX é decodificado e o resto é codificado)',
  badPercent: at => `Não deu para decodificar: o "%" na posição ${at} não é seguido de dois dígitos hex.`,
  badBytes: at => `Não deu para decodificar: os bytes perto da posição ${at} não são UTF-8 válido.`,
  encoded: 'Codificado.',
  decoded: 'Decodificado.',
  copied: 'Copiado para a área de transferência.',
}

const es: Strings = {
  command: 'Codifica o decodifica texto para URL y copia (usa la selección del ratón cuando no hay texto)',
  hint: '[encode|decode] [texto]',
  usage: 'Uso: /url [encode|decode] <texto>  (sin la palabra, el texto con %XX se decodifica y el resto se codifica)',
  badPercent: at => `No se pudo decodificar: el "%" en la posición ${at} no va seguido de dos dígitos hex.`,
  badBytes: at => `No se pudo decodificar: los bytes cerca de la posición ${at} no son UTF-8 válido.`,
  encoded: 'Codificado.',
  decoded: 'Decodificado.',
  copied: 'Copiado al portapapeles.',
}

export const STRINGS = { en, pt, es }
