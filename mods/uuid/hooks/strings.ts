const en = {
  command: 'Generate random UUIDs (1 by default, up to 20) and copy them',
  hint: '[n]',
  usage: 'Usage: /uuid [n]  (n from 1 to 20)',
  copied: (count: number) => `${count} UUID(s) copied to the clipboard.`,
  noClipboard: 'The clipboard is not reachable on this surface.',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Gera UUIDs aleatórios (1 por padrão, até 20) e copia',
  hint: '[n]',
  usage: 'Uso: /uuid [n]  (n de 1 a 20)',
  copied: count => `${count} UUID(s) copiado(s) para a área de transferência.`,
  noClipboard: 'Não foi possível acessar a área de transferência nesta superfície.',
}

const es: Strings = {
  command: 'Genera UUID aleatorios (1 por defecto, hasta 20) y los copia',
  hint: '[n]',
  usage: 'Uso: /uuid [n]  (n de 1 a 20)',
  copied: count => `${count} UUID copiado(s) al portapapeles.`,
  noClipboard: 'No se pudo acceder al portapapeles en esta superficie.',
}

export const STRINGS = { en, pt, es }
