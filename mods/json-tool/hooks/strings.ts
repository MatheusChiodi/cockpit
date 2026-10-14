const en = {
  command: 'Validate and pretty-print JSON (uses the mouse selection when no text is given)',
  hint: '[text]',
  usage: 'Usage: /json <text>  (or select the JSON and run /json)',
  valid: (lines: number) => `Valid JSON, ${lines} line(s) when formatted.`,
  copied: 'Formatted JSON copied to the clipboard.',
  invalid: (line: number, column: number, found: string) =>
    `Invalid JSON at line ${line}, column ${column}: unexpected ${found}.`,
  end: 'end of input',
  character: (value: string) => `character "${value}"`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Valida e formata JSON (usa a seleção do mouse quando não há texto)',
  hint: '[texto]',
  usage: 'Uso: /json <texto>  (ou selecione o JSON e rode /json)',
  valid: lines => `JSON válido, ${lines} linha(s) formatado.`,
  copied: 'JSON formatado copiado para a área de transferência.',
  invalid: (line, column, found) => `JSON inválido na linha ${line}, coluna ${column}: ${found} inesperado.`,
  end: 'fim da entrada',
  character: value => `caractere "${value}"`,
}

const es: Strings = {
  command: 'Valida y formatea JSON (usa la selección del ratón cuando no hay texto)',
  hint: '[texto]',
  usage: 'Uso: /json <texto>  (o selecciona el JSON y ejecuta /json)',
  valid: lines => `JSON válido, ${lines} línea(s) al formatearlo.`,
  copied: 'JSON formateado copiado al portapapeles.',
  invalid: (line, column, found) => `JSON inválido en la línea ${line}, columna ${column}: ${found} inesperado.`,
  end: 'fin de la entrada',
  character: value => `carácter "${value}"`,
}

export const STRINGS = { en, pt, es }
