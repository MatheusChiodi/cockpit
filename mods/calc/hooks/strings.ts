const en = {
  command: 'Calculate an expression with + - * / % ^, parentheses and decimals; uses the mouse selection when none is given',
  hint: '<expression>',
  usage: 'Usage: /calc <expression>  e.g. /calc (2 + 3) * 4 ^ 2 / 8',
  copied: 'Result copied to the clipboard.',
  character: (found: string, at: number) => `Unexpected character "${found}" at position ${at}.`,
  unexpected: (found: string, at: number) => `Unexpected "${found}" at position ${at}.`,
  end: 'The expression ends too soon: something is missing after the last operator.',
  paren: (at: number) => `The "(" at position ${at} is never closed.`,
  zero: 'Division by zero.',
  invalid: 'The result is not a finite number.',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Calcula uma expressão com + - * / % ^, parênteses e decimais; usa a seleção do mouse quando não há texto',
  hint: '<expressão>',
  usage: 'Uso: /calc <expressão>  ex.: /calc (2 + 3) * 4 ^ 2 / 8',
  copied: 'Resultado copiado para a área de transferência.',
  character: (found, at) => `Caractere inesperado "${found}" na posição ${at}.`,
  unexpected: (found, at) => `"${found}" inesperado na posição ${at}.`,
  end: 'A expressão termina cedo demais: falta algo depois do último operador.',
  paren: at => `O "(" da posição ${at} nunca é fechado.`,
  zero: 'Divisão por zero.',
  invalid: 'O resultado não é um número finito.',
}

const es: Strings = {
  command: 'Calcula una expresión con + - * / % ^, paréntesis y decimales; usa la selección del ratón cuando no hay texto',
  hint: '<expresión>',
  usage: 'Uso: /calc <expresión>  p. ej.: /calc (2 + 3) * 4 ^ 2 / 8',
  copied: 'Resultado copiado al portapapeles.',
  character: (found, at) => `Carácter inesperado "${found}" en la posición ${at}.`,
  unexpected: (found, at) => `"${found}" inesperado en la posición ${at}.`,
  end: 'La expresión termina demasiado pronto: falta algo después del último operador.',
  paren: at => `El "(" de la posición ${at} nunca se cierra.`,
  zero: 'División por cero.',
  invalid: 'El resultado no es un número finito.',
}

export const STRINGS = { en, pt, es }
