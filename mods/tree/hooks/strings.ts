const en = {
  command: 'Show the directory tree two levels deep, without node_modules, .git, build output and dot folders',
  hint: '[dir]',
  missing: (dir: string) => `Not a readable folder: ${dir}`,
  empty: 'Empty folder.',
  more: (count: number) => `… ${count} more not shown`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Mostra a árvore de diretórios em dois níveis, sem node_modules, .git, saídas de build e pastas com ponto',
  hint: '[pasta]',
  missing: dir => `Não é uma pasta legível: ${dir}`,
  empty: 'Pasta vazia.',
  more: count => `… mais ${count} não exibidos`,
}

const es: Strings = {
  command: 'Muestra el árbol de directorios en dos niveles, sin node_modules, .git, salidas de build ni carpetas con punto',
  hint: '[carpeta]',
  missing: dir => `No es una carpeta legible: ${dir}`,
  empty: 'Carpeta vacía.',
  more: count => `… ${count} más sin mostrar`,
}

export const STRINGS = { en, pt, es }
