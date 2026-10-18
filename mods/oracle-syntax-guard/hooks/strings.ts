const en = {
  blocked: (why: string) => `oracle-syntax-guard blocked the edit: ${why}.`,
  failed: 'oracle-syntax-guard: the check failed, edit refused.',
  reasons: {
    identity: (d: string) => `${d} does not exist in Oracle 11g (12c feature). Create a SEQUENCE and a BEFORE INSERT trigger that sets :NEW.id := seq.NEXTVAL when :NEW.id IS NULL`,
    listagg: (d: string) => `${d} does not exist in Oracle 11g. Plain LISTAGG works but raises ORA-01489 past 4000 bytes: aggregate fewer rows, or use XMLAGG(XMLELEMENT(...)).getClobVal()`,
    json: (d: string) => `${d} does not exist in Oracle 11g (JSON arrived in 12.1.0.2). Keep JSON in a CLOB and parse it in the application`,
    boolean: (d: string) => `a BOOLEAN column (${d}) is not valid in Oracle 11g, SQL has no BOOLEAN type. Use NUMBER(1) or CHAR(1) with a CHECK constraint (IN (0, 1) or IN ('Y', 'N'))`,
  },
}

type Strings = typeof en

export type Key = keyof Strings['reasons']

const pt: Strings = {
  blocked: why => `oracle-syntax-guard bloqueou a edição: ${why}.`,
  failed: 'oracle-syntax-guard: a verificação falhou, edição recusada.',
  reasons: {
    identity: (d: string) => `${d} não existe no Oracle 11g (recurso do 12c). Crie uma SEQUENCE e uma trigger BEFORE INSERT que faça :NEW.id := seq.NEXTVAL quando :NEW.id IS NULL`,
    listagg: (d: string) => `${d} não existe no Oracle 11g. O LISTAGG simples funciona mas dá ORA-01489 acima de 4000 bytes: agregue menos linhas ou use XMLAGG(XMLELEMENT(...)).getClobVal()`,
    json: (d: string) => `${d} não existe no Oracle 11g (JSON chegou no 12.1.0.2). Guarde o JSON em um CLOB e interprete na aplicação`,
    boolean: (d: string) => `coluna BOOLEAN (${d}) não é válida no Oracle 11g, o SQL não tem tipo BOOLEAN. Use NUMBER(1) ou CHAR(1) com CHECK (IN (0, 1) ou IN ('S', 'N'))`,
  },
}

const es: Strings = {
  blocked: why => `oracle-syntax-guard bloqueó la edición: ${why}.`,
  failed: 'oracle-syntax-guard: la verificación falló, edición rechazada.',
  reasons: {
    identity: (d: string) => `${d} no existe en Oracle 11g (función de 12c). Crea una SEQUENCE y un trigger BEFORE INSERT que haga :NEW.id := seq.NEXTVAL cuando :NEW.id IS NULL`,
    listagg: (d: string) => `${d} no existe en Oracle 11g. El LISTAGG simple funciona pero da ORA-01489 pasados 4000 bytes: agrega menos filas o usa XMLAGG(XMLELEMENT(...)).getClobVal()`,
    json: (d: string) => `${d} no existe en Oracle 11g (JSON llegó en 12.1.0.2). Guarda el JSON en un CLOB e interprétalo en la aplicación`,
    boolean: (d: string) => `una columna BOOLEAN (${d}) no es válida en Oracle 11g, el SQL no tiene tipo BOOLEAN. Usa NUMBER(1) o CHAR(1) con CHECK (IN (0, 1) o IN ('S', 'N'))`,
  },
}

export const STRINGS = { en, pt, es }
