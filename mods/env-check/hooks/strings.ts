const en = {
  command: 'Compare the keys of .env.example with .env: missing and extra (names only, never a value)',
  noExample: 'No .env.example in this project.',
  noEnv: 'No .env in this project.',
  missing: 'Missing in .env',
  extra: 'Not in .env.example',
  match: (count: number) => `.env has all ${count} keys of .env.example.`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Compara as chaves do .env.example com o .env: faltando e extras (só nomes, nunca um valor)',
  noExample: 'Nenhum .env.example neste projeto.',
  noEnv: 'Nenhum .env neste projeto.',
  missing: 'Faltando no .env',
  extra: 'Fora do .env.example',
  match: count => `O .env tem as ${count} chaves do .env.example.`,
}

const es: Strings = {
  command: 'Compara las claves de .env.example con .env: faltantes y sobrantes (solo nombres, nunca un valor)',
  noExample: 'No hay .env.example en este proyecto.',
  noEnv: 'No hay .env en este proyecto.',
  missing: 'Faltan en .env',
  extra: 'No están en .env.example',
  match: count => `El .env tiene las ${count} claves de .env.example.`,
}

export const STRINGS = { en, pt, es }
