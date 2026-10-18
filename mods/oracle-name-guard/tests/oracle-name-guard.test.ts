import { expect, test } from 'claude-code/testing'

let counter = 0

const fileOf = (path: string) => path.replaceAll('\\', '/').split('/').pop() ?? ''

// A project at /work whose build files are `build` and whose other files are `files` (by path); returns the toasts seen.
const project = (on: any, build: Record<string, string>, files: Record<string, string> = {}) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) => {
    const path = e.path.replaceAll('\\', '/')
    const name = fileOf(path)

    if (path.endsWith(`/work/${name}`) && name in build) {
      return { value: build[name] }
    }

    const hit = Object.entries(files).find(([file]) => path.endsWith(file))

    return hit === undefined ? { deny: 'ENOENT' } : { value: hit[1] }
  })
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return toasts
}

const write = ($: any, file_path: string, content: string) => {
  counter += 1

  return $.tool.call({ tool: 'Write', file_path, content, tool_use_id: `w-${counter}` })
}

const edit = ($: any, file_path: string, old_string: string, new_string: string) => {
  counter += 1

  return $.tool.call({ tool: 'Edit', file_path, old_string, new_string, tool_use_id: `e-${counter}` })
}

const JAVA = { 'pom.xml': '<project><artifactId>app</artifactId></project>' }
const ORACLE = { 'pom.xml': '<project><dependency><artifactId>ojdbc8</artifactId></dependency></project>' }

const FILE = "/work/db/002_indexes.sql"
const BAD: readonly (readonly [string, string])[] = [["CREATE INDEX IDX_ORDER_ITEMS_ORDER_ID_PRODUCT_ID_UNIQ ON order_items (order_id, product_id);","IDX_ORDER_ITEMS_ORDER_ID_PRODUCT_ID_UNIQ (40) is longer than the 30"],["ALTER TABLE orders ADD CONSTRAINT FK_ORDERS_CUSTOMER_REGISTRATION_ID FOREIGN KEY (c) REFERENCES customers (id);","FK_ORDERS_CUSTOMER_REGISTRATION_ID (34) is longer than the 30"],["CREATE SEQUENCE app.SEQ_CUSTOMER_REGISTRATION_ORDER_NUMBER START WITH 1;","SEQ_CUSTOMER_REGISTRATION_ORDER_NUMBER (38) is longer than the 30"]]
const GOOD: readonly string[] = ["CREATE INDEX IDX_ORDER_ITEMS_ORDER_PRODUCT ON order_items (order_id, product_id);","CREATE INDEX IDX_EXACTLY_THIRTY_CHARS_LONG1 ON t (a);","ALTER TABLE orders ADD CONSTRAINT FK_ORDERS_CUSTOMER FOREIGN KEY (c) REFERENCES customers (id);","-- CREATE INDEX IDX_ORDER_ITEMS_ORDER_ID_PRODUCT_ID_UNIQ ON t (a)\nSELECT 1 FROM dual;","SELECT a_really_long_column_alias_that_is_fine_in_a_query FROM dual;"]
const KEPT = "CREATE INDEX IDX_ORDER_ITEMS_ORDER_ID_PRODUCT_ID_UNIQ ON t (a);"

test('refuses what 11g cannot run, with what to use instead', async ($, on) => {
  project(on, ORACLE)

  for (const [content, expected] of BAD) {
    const ran = await write($, FILE, content)
    expect(ran.deny, content).toContain('oracle-name-guard blocked the edit')
    expect(ran.deny, content).toContain(expected)
  }
})

test('lets correct look-alike code through', async ($, on) => {
  project(on, ORACLE)

  for (const content of GOOD) {
    expect((await write($, FILE, content)).deny, content).toBeUndefined()
  }
})

test('judges only what an Edit adds, and only in the right files', async ($, on) => {
  project(on, ORACLE, { [FILE.slice('/work/'.length)]: `${KEPT}\nSELECT 1 FROM dual;` })

  const kept = await edit($, FILE, 'SELECT 1 FROM dual;', 'SELECT 2 FROM dual;')
  expect(kept.deny).toBeUndefined()

  const added = await edit($, FILE, 'SELECT 1 FROM dual;', BAD[0]?.[0] ?? '')
  expect(added.deny).toContain(BAD[0]?.[1])

  const other = await write($, '/work/README.md', BAD[0]?.[0] ?? '')
  expect(other.deny).toBeUndefined()
})

test('does nothing when the stack is absent', async ($, on) => {
  project(on, {})

  for (const [content] of BAD) {
    expect((await write($, FILE, content)).deny, content).toBeUndefined()
  }
})

test('leaves a Java project without the Oracle driver alone', async ($, on) => {
  project(on, JAVA)

  for (const [content] of BAD) {
    expect((await write($, FILE, content)).deny, content).toBeUndefined()
  }
})

test('speaks the language set in the hub', async ($, on) => {
  project(on, ORACLE)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const ran = await write($, FILE, "CREATE INDEX IDX_ORDER_ITEMS_ORDER_ID_PRODUCT_ID_UNIQ ON t (a);")
  expect(ran.deny).toContain("oracle-name-guard bloqueou a edição: IDX_ORDER_ITEMS_ORDER_ID_PRODUCT_ID_UNIQ (40) passa dos 30 caracteres")
})

const LONG_TABLE = 'CUSTOMER_REGISTRATION_HISTORY_ENTRIES'

test('detects the driver in build.gradle and in package.json', async ($, on) => {
  project(on, { 'build.gradle': "dependencies { runtimeOnly 'com.oracle.database.jdbc:ojdbc11:23.3.0.23.09' }" })

  expect((await write($, FILE, `CREATE TABLE ${LONG_TABLE} (id NUMBER);`)).deny).toContain(`${LONG_TABLE} (37)`)
})

test('detects oracledb among the dependencies of package.json', async ($, on) => {
  project(on, { 'package.json': JSON.stringify({ dependencies: { oracledb: '6.0.0' } }) })

  expect((await write($, FILE, `CREATE TABLE ${LONG_TABLE} (id NUMBER);`)).deny).toContain('ORA-00972')
})

test('catches quoted, schema-qualified and PL/SQL object names', async ($, on) => {
  project(on, ORACLE)

  const CASES = [
    `CREATE TABLE app."${LONG_TABLE}" (id NUMBER);`,
    `CREATE GLOBAL TEMPORARY TABLE ${LONG_TABLE} (id NUMBER);`,
    `CREATE OR REPLACE PACKAGE BODY PKG_CUSTOMER_REGISTRATION_HELPERS AS END;`,
    `CREATE UNIQUE INDEX UK_CUSTOMER_REGISTRATION_EMAIL_ADDR ON t (a);`,
  ]

  for (const content of CASES) {
    expect((await write($, FILE, content)).deny, content).toContain('is longer than the 30')
  }
})

test('lists every new long name of one write', async ($, on) => {
  project(on, ORACLE)

  const ran = await write($, FILE, `${BAD[0]?.[0]}\n${BAD[2]?.[0]}`)
  expect(ran.deny).toContain('IDX_ORDER_ITEMS_ORDER_ID_PRODUCT_ID_UNIQ (40)')
  expect(ran.deny).toContain('SEQ_CUSTOMER_REGISTRATION_ORDER_NUMBER (38)')
})

test('reads names from SQL in Java string literals', async ($, on) => {
  project(on, ORACLE)
  const path = '/work/src/main/java/Schema.java'

  const ran = await write($, path, `class S { String ddl = "CREATE TABLE ${LONG_TABLE} (id NUMBER)"; }`)
  expect(ran.deny).toContain(LONG_TABLE)

  const comment = await write($, path, `class S {\n  // CREATE TABLE ${LONG_TABLE} (id NUMBER)\n  String q = "SELECT 1 FROM dual";\n}`)
  expect(comment.deny).toBeUndefined()
})

test('refuses the edit when the check itself fails', async ($, on) => {
  on('session.root', () => {
    throw new Error('no root')
  })
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))

  expect((await write($, FILE, 'SELECT 1 FROM dual;')).deny).toBe('oracle-name-guard: the check failed, edit refused.')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  project(on, ORACLE)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const ran = await write($, FILE, BAD[1]?.[0] ?? '')
  expect(ran.deny).toContain('oracle-name-guard bloqueó la edición: FK_ORDERS_CUSTOMER_REGISTRATION_ID (34) pasa de los 30 caracteres')
})
