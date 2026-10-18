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

const FILE = "/work/db/001_orders.sql"
const BAD: readonly (readonly [string, string])[] = [["CREATE TABLE orders (id NUMBER GENERATED ALWAYS AS IDENTITY, name VARCHAR2(10));","GENERATED ALWAYS AS IDENTITY does not exist in Oracle 11g"],["SELECT LISTAGG(name, ',' ON OVERFLOW TRUNCATE) WITHIN GROUP (ORDER BY name) FROM t;","LISTAGG ... ON OVERFLOW"],["SELECT JSON_VALUE(doc, '$.a') FROM t;","JSON_VALUE does not exist in Oracle 11g"],["CREATE TABLE flags (id NUMBER, active BOOLEAN NOT NULL);","active BOOLEAN"],["ALTER TABLE flags ADD done BOOLEAN;","done BOOLEAN"]]
const GOOD: readonly string[] = ["CREATE TABLE orders (id NUMBER PRIMARY KEY, active NUMBER(1) DEFAULT 0 CHECK (active IN (0, 1)));","SELECT LISTAGG(name, ',') WITHIN GROUP (ORDER BY name) FROM t;","CREATE OR REPLACE PROCEDURE p (ok IN BOOLEAN) IS\n  done BOOLEAN := FALSE;\nBEGIN\n  NULL;\nEND;","-- id NUMBER GENERATED ALWAYS AS IDENTITY\nSELECT 'json_value(' FROM dual;","CREATE TABLE t (json_doc CLOB, is_json_flag NUMBER(1));"]
const KEPT = "CREATE TABLE old (id NUMBER GENERATED ALWAYS AS IDENTITY);"

test('refuses what 11g cannot run, with what to use instead', async ($, on) => {
  project(on, ORACLE)

  for (const [content, expected] of BAD) {
    const ran = await write($, FILE, content)
    expect(ran.deny, content).toContain('oracle-syntax-guard blocked the edit')
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

  const ran = await write($, FILE, "CREATE TABLE flags (id NUMBER, active BOOLEAN);")
  expect(ran.deny).toContain("oracle-syntax-guard bloqueou a edição: coluna BOOLEAN (active BOOLEAN) não é válida no Oracle 11g")
})

test('detects the Oracle driver from oracledb in package.json', async ($, on) => {
  project(on, { 'package.json': JSON.stringify({ devDependencies: { oracledb: '^6.0.0' } }) })

  const ran = await write($, FILE, "SELECT doc FROM t WHERE doc IS JSON;")
  expect(ran.deny).toContain('IS JSON does not exist in Oracle 11g')
})

test('treats an invalid package.json as no Oracle driver', async ($, on) => {
  project(on, { 'package.json': '{ not json' })

  expect((await write($, FILE, BAD[0]?.[0] ?? '')).deny).toBeUndefined()
})

test('reads SQL inside Java string literals and text blocks, not in comments', async ($, on) => {
  project(on, ORACLE)
  const path = '/work/src/main/java/OrderDao.java'

  const literal = await write($, path, 'class A { String q = "SELECT JSON_QUERY(doc, \'$.a\') FROM t"; }')
  expect(literal.deny).toContain('JSON_QUERY does not exist in Oracle 11g')

  const block = await write($, path, 'class A { String q = """\n  CREATE TABLE t (id NUMBER GENERATED BY DEFAULT AS IDENTITY)\n"""; }')
  expect(block.deny).toContain('GENERATED BY DEFAULT AS IDENTITY')

  const comment = await write($, path, 'class A {\n  // SELECT JSON_VALUE(doc) FROM t\n  /* CREATE TABLE t (id NUMBER GENERATED ALWAYS AS IDENTITY) */\n  String q = "SELECT 1 FROM dual";\n}')
  expect(comment.deny).toBeUndefined()
})

test('checks MyBatis mapper XML but not other XML', async ($, on) => {
  project(on, ORACLE)

  const mapper = await write($, '/work/src/main/resources/OrderMapper.xml', '<mapper><select id="a">SELECT JSON_VALUE(doc, \'$.a\') FROM t</select></mapper>')
  expect(mapper.deny).toContain('JSON_VALUE')

  const config = await write($, '/work/src/main/resources/logback.xml', '<configuration>JSON_VALUE(doc)</configuration>')
  expect(config.deny).toBeUndefined()

  const commented = await write($, '/work/src/main/resources/OrderMapper.xml', '<mapper><!-- JSON_VALUE(doc) --><select id="a">SELECT 1 FROM dual</select></mapper>')
  expect(commented.deny).toBeUndefined()
})

test('judges an Edit by its own strings when the file cannot be read', async ($, on) => {
  project(on, ORACLE)

  const ran = await edit($, '/work/db/missing.sql', 'SELECT 1 FROM dual;', 'ALTER TABLE t ADD flag BOOLEAN;')
  expect(ran.deny).toContain('flag BOOLEAN')
})

test('refuses the edit when the check itself fails', async ($, on) => {
  on('session.root', () => {
    throw new Error('no root')
  })
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))

  const ran = await write($, FILE, 'SELECT 1 FROM dual;')
  expect(ran.deny).toBe('oracle-syntax-guard: the check failed, edit refused.')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  project(on, ORACLE)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const ran = await write($, FILE, BAD[2]?.[0] ?? '')
  expect(ran.deny).toContain('oracle-syntax-guard bloqueó la edición: JSON_VALUE no existe en Oracle 11g')
})
