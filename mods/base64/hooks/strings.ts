const en = {
  command: 'Encode or decode Base64 (UTF-8 safe); uses the mouse selection when no text is given',
  hint: 'enc|dec <text>',
  usage: 'Usage: /b64 enc <text>  or  /b64 dec <text>',
  copied: 'Copied to the clipboard.',
  invalidBase64: 'Not valid Base64.',
  invalidText: 'The bytes are not valid UTF-8 text.',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Codifica ou decodifica Base64 (seguro com UTF-8); usa a seleção do mouse quando não há texto',
  hint: 'enc|dec <texto>',
  usage: 'Uso: /b64 enc <texto>  ou  /b64 dec <texto>',
  copied: 'Copiado para a área de transferência.',
  invalidBase64: 'Base64 inválido.',
  invalidText: 'Os bytes não são um texto UTF-8 válido.',
}

const es: Strings = {
  command: 'Codifica o decodifica Base64 (seguro con UTF-8); usa la selección del ratón cuando no hay texto',
  hint: 'enc|dec <texto>',
  usage: 'Uso: /b64 enc <texto>  o  /b64 dec <texto>',
  copied: 'Copiado al portapapeles.',
  invalidBase64: 'Base64 no válido.',
  invalidText: 'Los bytes no son un texto UTF-8 válido.',
}

export const STRINGS = { en, pt, es }
