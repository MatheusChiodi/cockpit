const en = {
  command: 'Open the pane comparing the keys of .env.example with .env (names only, never values)',
  opened: 'Env keys pane opened.',
  title: 'env keys',
  refresh: 'Refresh',
  notLoaded: 'Loading…',
  noExample: 'No readable .env.example here.',
  noEnv: 'No readable .env: every key of .env.example is missing.',
  inSync: '.env has every key of .env.example.',
  missing: 'missing',
  missingNote: 'in .env',
  extra: 'extra',
  extraNote: 'not in .env.example',
  summary: (missing: number, extra: number) => `${missing} missing · ${extra} extra`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Abre o painel que compara as chaves do .env.example com o .env (só nomes, nunca valores)',
  opened: 'Painel de chaves do env aberto.',
  title: 'env keys',
  refresh: 'Atualizar',
  notLoaded: 'Carregando…',
  noExample: 'Nenhum .env.example legível aqui.',
  noEnv: 'Nenhum .env legível: todas as chaves do .env.example estão faltando.',
  inSync: 'O .env tem todas as chaves do .env.example.',
  missing: 'faltando',
  missingNote: 'no .env',
  extra: 'extras',
  extraNote: 'fora do .env.example',
  summary: (missing, extra) => `${missing} faltando · ${extra} extras`,
}

const es: Strings = {
  command: 'Abre el panel que compara las claves de .env.example con .env (solo nombres, nunca valores)',
  opened: 'Panel de claves del env abierto.',
  title: 'env keys',
  refresh: 'Actualizar',
  notLoaded: 'Cargando…',
  noExample: 'No hay un .env.example legible aquí.',
  noEnv: 'No hay un .env legible: faltan todas las claves de .env.example.',
  inSync: 'El .env tiene todas las claves de .env.example.',
  missing: 'faltan',
  missingNote: 'en .env',
  extra: 'extras',
  extraNote: 'fuera de .env.example',
  summary: (missing, extra) => `${missing} faltan · ${extra} extras`,
}

export const STRINGS = { en, pt, es }
