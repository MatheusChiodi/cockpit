const en = {
  command: 'Show what a pull request changes against its base: files with lines added and removed',
  hint: '[number]',
  usage: 'Usage: /prdiff [number]',
  noGh: 'GitHub CLI (gh) is missing, not signed in, or there is no pull request here.',
  head: (number: number, from: string, to: string, files: number, added: number, removed: number) =>
    `PR #${number}  ${from} → ${to}  ${files} file(s)  +${added} -${removed}`,
  more: (count: number) => `  … and ${count} more file(s)`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Mostra o que um pull request muda em relação à base: arquivos com linhas adicionadas e removidas',
  hint: '[número]',
  usage: 'Uso: /prdiff [número]',
  noGh: 'O GitHub CLI (gh) não está instalado, não está autenticado, ou não há pull request aqui.',
  head: (number, from, to, files, added, removed) =>
    `PR #${number}  ${from} → ${to}  ${files} arquivo(s)  +${added} -${removed}`,
  more: count => `  … e mais ${count} arquivo(s)`,
}

const es: Strings = {
  command: 'Muestra lo que un pull request cambia respecto a la base: archivos con líneas agregadas y eliminadas',
  hint: '[número]',
  usage: 'Uso: /prdiff [número]',
  noGh: 'GitHub CLI (gh) no está instalado, no ha iniciado sesión, o no hay pull request aquí.',
  head: (number, from, to, files, added, removed) =>
    `PR #${number}  ${from} → ${to}  ${files} archivo(s)  +${added} -${removed}`,
  more: count => `  … y ${count} archivo(s) más`,
}

export const STRINGS = { en, pt, es }
