const en = {
  blocked: (why: string) => `oracle-name-guard blocked the edit: ${why}.`,
  failed: 'oracle-name-guard: the check failed, edit refused.',
  reasons: {
    long: (d: string) => `${d} is longer than the 30 characters Oracle 11g allows for a table, index, constraint, sequence, trigger or view name (ORA-00972). Shorten it, for example with an abbreviated table prefix and a suffix like _PK, _FK, _UK, _IDX`,
  },
}

type Strings = typeof en

export type Key = keyof Strings['reasons']

const pt: Strings = {
  blocked: why => `oracle-name-guard bloqueou a edição: ${why}.`,
  failed: 'oracle-name-guard: a verificação falhou, edição recusada.',
  reasons: {
    long: (d: string) => `${d} passa dos 30 caracteres que o Oracle 11g aceita em nome de tabela, índice, constraint, sequence, trigger ou view (ORA-00972). Encurte, por exemplo com um prefixo abreviado da tabela e um sufixo como _PK, _FK, _UK, _IDX`,
  },
}

const es: Strings = {
  blocked: why => `oracle-name-guard bloqueó la edición: ${why}.`,
  failed: 'oracle-name-guard: la verificación falló, edición rechazada.',
  reasons: {
    long: (d: string) => `${d} pasa de los 30 caracteres que Oracle 11g admite en el nombre de una tabla, índice, constraint, sequence, trigger o vista (ORA-00972). Acórtalo, por ejemplo con un prefijo abreviado de la tabla y un sufijo como _PK, _FK, _UK, _IDX`,
  },
}

export const STRINGS = { en, pt, es }
