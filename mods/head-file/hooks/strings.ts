const en = {
  command: 'Show the first lines of a project file, numbered (20 by default, up to 60)',
  hint: '<path> [lines]',
  usage: 'Usage: /head <path> [lines]',
  outside: (path: string) => `Outside the project: ${path}`,
  secret: (path: string) => `${path} may hold secrets: not printed.`,
  missing: (path: string) => `Not found: ${path}`,
  notFile: (path: string) => `Not a file: ${path}`,
  unreadable: (path: string) => `Could not read ${path} (binary or over 4 MiB).`,
  empty: (path: string) => `${path} is empty.`,
  more: (count: number) => `… ${count} more lines not shown`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Mostra as primeiras linhas de um arquivo do projeto, numeradas (20 por padrão, até 60)',
  hint: '<caminho> [linhas]',
  usage: 'Uso: /head <caminho> [linhas]',
  outside: path => `Fora do projeto: ${path}`,
  secret: path => `${path} pode guardar segredos: não exibido.`,
  missing: path => `Não encontrado: ${path}`,
  notFile: path => `Não é um arquivo: ${path}`,
  unreadable: path => `Não foi possível ler ${path} (binário ou acima de 4 MiB).`,
  empty: path => `${path} está vazio.`,
  more: count => `… mais ${count} linhas não mostradas`,
}

const es: Strings = {
  command: 'Muestra las primeras líneas de un archivo del proyecto, numeradas (20 por defecto, hasta 60)',
  hint: '<ruta> [líneas]',
  usage: 'Uso: /head <ruta> [líneas]',
  outside: path => `Fuera del proyecto: ${path}`,
  secret: path => `${path} puede guardar secretos: no se muestra.`,
  missing: path => `No encontrado: ${path}`,
  notFile: path => `No es un archivo: ${path}`,
  unreadable: path => `No se pudo leer ${path} (binario o mayor de 4 MiB).`,
  empty: path => `${path} está vacío.`,
  more: count => `… ${count} líneas más no mostradas`,
}

export const STRINGS = { en, pt, es }
