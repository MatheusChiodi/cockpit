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

const FILE = "/work/db/queries.sql"
const BAD: readonly (readonly [string, string])[] = [["SELECT id FROM orders ORDER BY id FETCH FIRST 10 ROWS ONLY;","FETCH FIRST 10 ROWS ONLY does not exist in Oracle 11g"],["SELECT id FROM orders ORDER BY id OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;","OFFSET 20 ROWS does not exist in Oracle 11g"],["SELECT id FROM orders LIMIT 10;","LIMIT 10 is not Oracle SQL"],["SELECT id FROM orders ORDER BY id LIMIT :n","ROWNUM"]]
const GOOD: readonly string[] = ["SELECT * FROM (SELECT a.*, ROWNUM rn FROM (SELECT id FROM orders ORDER BY id) a WHERE ROWNUM <= :max) WHERE rn > :min;","FETCH c BULK COLLECT INTO ids LIMIT 100;","SELECT id FROM orders WHERE ROWNUM <= 10;","-- SELECT id FROM orders FETCH FIRST 10 ROWS ONLY\nSELECT 1 FROM dual;","UPDATE settings SET limit_rows = 10 WHERE id = 1;"]
const KEPT = "SELECT id FROM old LIMIT 5;"

test('refuses what 11g cannot run, with what to use instead', async ($, on) => {
  project(on, ORACLE)

  for (const [content, expected] of BAD) {
    const ran = await write($, FILE, content)
    expect(ran.deny, content).toContain('oracle-paging-guard blocked the edit')
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

  const ran = await write($, FILE, "SELECT id FROM orders FETCH FIRST 5 ROWS ONLY;")
  expect(ran.deny).toContain("oracle-paging-guard bloqueou a edição: FETCH FIRST 5 ROWS ONLY não existe no Oracle 11g")
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  project(on, ORACLE)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const ran = await write($, FILE, 'SELECT id FROM orders LIMIT 10;')
  expect(ran.deny).toContain('oracle-paging-guard bloqueó la edición: LIMIT 10 no es SQL de Oracle')
})

test('detects the driver in a Gradle build', async ($, on) => {
  project(on, { 'build.gradle': "implementation 'com.oracle.database.jdbc:ojdbc11:23.3.0.23.09'" })

  expect((await write($, FILE, 'SELECT id FROM orders LIMIT 10;')).deny).toContain('LIMIT 10')
})

test('detects oracledb in package.json', async ($, on) => {
  project(on, { 'package.json': JSON.stringify({ dependencies: { oracledb: '6' } }) })

  expect((await write($, FILE, 'SELECT id FROM orders FETCH FIRST 3 ROWS ONLY;')).deny).toContain('FETCH FIRST 3 ROWS ONLY')
})

test('reads SQL inside Java string literals and MyBatis mappers, not Java comments', async ($, on) => {
  project(on, ORACLE)

  const java = await write($, '/work/src/Repo.java', 'String q = "SELECT id FROM orders FETCH FIRST 5 ROWS ONLY";')
  expect(java.deny).toContain('FETCH FIRST 5 ROWS ONLY')

  const comment = await write($, '/work/src/Repo.java', '// SELECT id FROM orders LIMIT 5\nint limit = 5;')
  expect(comment.deny).toBeUndefined()

  const mapper = await write($, '/work/src/OrderMapper.xml', '<mapper><select id="page">SELECT id FROM orders LIMIT 10</select></mapper>')
  expect(mapper.deny).toContain('LIMIT 10')

  const xml = await write($, '/work/pom2.xml', '<project><limit>10</limit></project>')
  expect(xml.deny).toBeUndefined()
})

test('ignores paging words inside SQL string literals', async ($, on) => {
  project(on, ORACLE)

  expect((await write($, FILE, "SELECT 'LIMIT 10' AS label FROM dual;")).deny).toBeUndefined()
})

test('refuses the edit when the check itself throws', async ($, on) => {
  on('session.root', () => {
    throw new Error('boom')
  })
  on('fs.read', () => ({ deny: 'ENOENT' }))
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))

  const ran = await write($, FILE, 'SELECT 1 FROM dual;')
  expect(ran.deny).toBe('oracle-paging-guard: the check failed, edit refused.')
})
