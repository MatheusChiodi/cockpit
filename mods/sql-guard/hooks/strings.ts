const en = {
  blocked: (why: string) => `sql-guard blocked the command: ${why}. Ask the user to run it by hand if it is intended.`,
  failed: 'sql-guard: the check failed, command refused.',
  drop: 'DROP deletes the whole object',
  truncate: 'TRUNCATE deletes every row with no rollback',
  deleteAll: 'DELETE without WHERE empties the whole table',
  updateAll: 'UPDATE without WHERE changes every row',
}

type Strings = typeof en

const pt: Strings = {
  blocked: why => `sql-guard bloqueou o comando: ${why}. Peça ao usuário para rodar manualmente se for intencional.`,
  failed: 'sql-guard: a verificação falhou, comando recusado.',
  drop: 'DROP apaga o objeto inteiro',
  truncate: 'TRUNCATE apaga todas as linhas sem rollback',
  deleteAll: 'DELETE sem WHERE apaga a tabela toda',
  updateAll: 'UPDATE sem WHERE altera todas as linhas',
}

const es: Strings = {
  blocked: why => `sql-guard bloqueó el comando: ${why}. Pide al usuario que lo ejecute a mano si es intencional.`,
  failed: 'sql-guard: la verificación falló, comando rechazado.',
  drop: 'DROP borra el objeto entero',
  truncate: 'TRUNCATE borra todas las filas sin rollback',
  deleteAll: 'DELETE sin WHERE vacía la tabla entera',
  updateAll: 'UPDATE sin WHERE modifica todas las filas',
}

export type Reason = 'drop' | 'truncate' | 'deleteAll' | 'updateAll'

export const STRINGS = { en, pt, es }
