const en = {
  command: "Open a file or folder of the project in the system's default app",
  hint: '<path>',
  usage: 'Usage: /open <path>',
  outside: (path: string) => `Outside the project: ${path}`,
  missing: (path: string) => `Not found: ${path}`,
  opened: (path: string) => `Opened ${path}`,
  failed: 'Could not start the system opener.',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Abre um arquivo ou pasta do projeto no app padrão do sistema',
  hint: '<caminho>',
  usage: 'Uso: /open <caminho>',
  outside: path => `Fora do projeto: ${path}`,
  missing: path => `Não encontrado: ${path}`,
  opened: path => `Abriu ${path}`,
  failed: 'Não foi possível iniciar o abridor do sistema.',
}

const es: Strings = {
  command: 'Abre un archivo o carpeta del proyecto en la app predeterminada del sistema',
  hint: '<ruta>',
  usage: 'Uso: /open <ruta>',
  outside: path => `Fuera del proyecto: ${path}`,
  missing: path => `No encontrado: ${path}`,
  opened: path => `Abrió ${path}`,
  failed: 'No se pudo iniciar el abridor del sistema.',
}

export const STRINGS = { en, pt, es }
