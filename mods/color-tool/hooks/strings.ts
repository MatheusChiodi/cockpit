const en = {
  command: 'Convert a color between hex, rgb and hsl and check its WCAG contrast',
  hint: '<color>',
  usage: 'Usage: /color <value>  e.g. /color #ff8800, /color rgb(255, 136, 0) or /color hsl(32, 100%, 50%)',
  copied: 'Hex copied to the clipboard.',
  white: 'vs white',
  black: 'vs black',
  fail: 'fail',
  large: 'AA large text',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Converte uma cor entre hex, rgb e hsl e confere o contraste WCAG',
  hint: '<cor>',
  usage: 'Uso: /color <valor>  ex.: /color #ff8800, /color rgb(255, 136, 0) ou /color hsl(32, 100%, 50%)',
  copied: 'Hex copiado para a área de transferência.',
  white: 'sobre branco',
  black: 'sobre preto',
  fail: 'reprova',
  large: 'AA texto grande',
}

const es: Strings = {
  command: 'Convierte un color entre hex, rgb y hsl y comprueba su contraste WCAG',
  hint: '<color>',
  usage: 'Uso: /color <valor>  p. ej.: /color #ff8800, /color rgb(255, 136, 0) o /color hsl(32, 100%, 50%)',
  copied: 'Hex copiado al portapapeles.',
  white: 'sobre blanco',
  black: 'sobre negro',
  fail: 'no pasa',
  large: 'AA texto grande',
}

export const STRINGS = { en, pt, es }
