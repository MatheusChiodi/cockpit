const en = {
  command: 'Convert a name to camelCase, snake_case, kebab-case, PascalCase, CONSTANT_CASE or a slug',
  hint: '[camel|snake|kebab|pascal|constant|slug] <text>',
  usage: 'Usage: /case [camel|snake|kebab|pascal|constant|slug] <text>  (without a style, shows all of them)',
  empty: 'Nothing to convert: the text has no letters or digits.',
  copied: 'Copied to the clipboard.',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Converte um nome para camelCase, snake_case, kebab-case, PascalCase, CONSTANT_CASE ou slug',
  hint: '[camel|snake|kebab|pascal|constant|slug] <texto>',
  usage: 'Uso: /case [camel|snake|kebab|pascal|constant|slug] <texto>  (sem o estilo, mostra todos)',
  empty: 'Nada para converter: o texto não tem letras nem dígitos.',
  copied: 'Copiado para a área de transferência.',
}

const es: Strings = {
  command: 'Convierte un nombre a camelCase, snake_case, kebab-case, PascalCase, CONSTANT_CASE o slug',
  hint: '[camel|snake|kebab|pascal|constant|slug] <texto>',
  usage: 'Uso: /case [camel|snake|kebab|pascal|constant|slug] <texto>  (sin el estilo, muestra todos)',
  empty: 'Nada que convertir: el texto no tiene letras ni dígitos.',
  copied: 'Copiado al portapapeles.',
}

export const STRINGS = { en, pt, es }
