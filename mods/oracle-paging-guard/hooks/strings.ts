const en = {
  blocked: (why: string) => `oracle-paging-guard blocked the edit: ${why}.`,
  failed: 'oracle-paging-guard: the check failed, edit refused.',
  reasons: {
    fetch: (d: string) => `${d} does not exist in Oracle 11g (row limiting came in 12c). Page with ROWNUM in a wrapped, already ordered query: SELECT * FROM (SELECT a.*, ROWNUM rn FROM (SELECT ... ORDER BY ...) a WHERE ROWNUM <= :max) WHERE rn > :min`,
    offset: (d: string) => `${d} does not exist in Oracle 11g (12c syntax). Use ROWNUM in a wrapped, already ordered query: SELECT * FROM (SELECT a.*, ROWNUM rn FROM (SELECT ... ORDER BY ...) a WHERE ROWNUM <= :max) WHERE rn > :min`,
    limit: (d: string) => `${d} is not Oracle SQL (11g has no LIMIT). Use ROWNUM: WHERE ROWNUM <= :n on an ordered subquery, and the wrapped ROWNUM form for an offset`,
  },
}

type Strings = typeof en

export type Key = keyof Strings['reasons']

const pt: Strings = {
  blocked: why => `oracle-paging-guard bloqueou a edição: ${why}.`,
  failed: 'oracle-paging-guard: a verificação falhou, edição recusada.',
  reasons: {
    fetch: (d: string) => `${d} não existe no Oracle 11g (limitação de linhas veio no 12c). Pagine com ROWNUM em consulta já ordenada e encapsulada: SELECT * FROM (SELECT a.*, ROWNUM rn FROM (SELECT ... ORDER BY ...) a WHERE ROWNUM <= :max) WHERE rn > :min`,
    offset: (d: string) => `${d} não existe no Oracle 11g (sintaxe do 12c). Use ROWNUM em consulta já ordenada e encapsulada: SELECT * FROM (SELECT a.*, ROWNUM rn FROM (SELECT ... ORDER BY ...) a WHERE ROWNUM <= :max) WHERE rn > :min`,
    limit: (d: string) => `${d} não é SQL do Oracle (o 11g não tem LIMIT). Use ROWNUM: WHERE ROWNUM <= :n em subconsulta ordenada, e a forma encapsulada com ROWNUM para offset`,
  },
}

const es: Strings = {
  blocked: why => `oracle-paging-guard bloqueó la edición: ${why}.`,
  failed: 'oracle-paging-guard: la verificación falló, edición rechazada.',
  reasons: {
    fetch: (d: string) => `${d} no existe en Oracle 11g (la limitación de filas llegó en 12c). Pagina con ROWNUM en una consulta ya ordenada y envuelta: SELECT * FROM (SELECT a.*, ROWNUM rn FROM (SELECT ... ORDER BY ...) a WHERE ROWNUM <= :max) WHERE rn > :min`,
    offset: (d: string) => `${d} no existe en Oracle 11g (sintaxis de 12c). Usa ROWNUM en una consulta ya ordenada y envuelta: SELECT * FROM (SELECT a.*, ROWNUM rn FROM (SELECT ... ORDER BY ...) a WHERE ROWNUM <= :max) WHERE rn > :min`,
    limit: (d: string) => `${d} no es SQL de Oracle (11g no tiene LIMIT). Usa ROWNUM: WHERE ROWNUM <= :n en una subconsulta ordenada, y la forma envuelta con ROWNUM para un offset`,
  },
}

export const STRINGS = { en, pt, es }
