const en = {
  failed: 'sql-concat-guard: the check failed, confirm before continuing.',
  concat: (where: string) =>
    `sql-concat-guard: builds an SQL statement by joining strings in ${where}. A value with a quote rewrites the query (SQL injection); use bind parameters (? or $1) instead.`,
}

type Strings = typeof en

const pt: Strings = {
  failed: 'sql-concat-guard: a verificação falhou, confirme antes de continuar.',
  concat: where =>
    `sql-concat-guard: monta um comando SQL juntando strings em ${where}. Um valor com aspas reescreve a consulta (SQL injection); use parâmetros (? ou $1).`,
}

const es: Strings = {
  failed: 'sql-concat-guard: la verificación falló, confirma antes de continuar.',
  concat: where =>
    `sql-concat-guard: arma una sentencia SQL uniendo strings en ${where}. Un valor con comillas reescribe la consulta (inyección SQL); usa parámetros (? o $1).`,
}

export type What = 'concat'

export const STRINGS = { en, pt, es }
