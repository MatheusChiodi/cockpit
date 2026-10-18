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

const FILE = "/work/db/fix_status.sql"
const BAD: readonly (readonly [string, string])[] = [["DELETE FROM orders;","DELETE FROM orders without WHERE"],["UPDATE orders o SET status = 'X'\n;","UPDATE orders without WHERE"],["BEGIN\n  DELETE FROM audit_log\n  COMMIT;\nEND;","DELETE FROM audit_log without WHERE"]]
const GOOD: readonly string[] = ["DELETE FROM orders WHERE id = 1;","UPDATE orders SET status = 'X' WHERE id IN (SELECT id FROM tmp);","-- DELETE FROM orders;\nSELECT 1 FROM dual;","SELECT * FROM orders FOR UPDATE;","CREATE TABLE t (a NUMBER, CONSTRAINT fk FOREIGN KEY (a) REFERENCES p (id) ON DELETE CASCADE);","TRUNCATE TABLE staging;"]
const KEPT = "DELETE FROM old_rows;"

test('notes what a Write adds, with the fix', async ($, on) => {
  const toasts = project(on, ORACLE)

  for (const [content, expected] of BAD) {
    const ran = await write($, FILE, content)
    expect(ran.context?.[0], content).toContain('sql-no-where-note: ')
    expect(ran.context?.[0], content).toContain(expected)
  }

  expect(toasts.length).toBe(BAD.length)
  expect(toasts[0]).toContain('sql-no-where-note: ')
  expect(toasts[0]).toContain('Claude was told')
})

test('stays silent for correct look-alike code', async ($, on) => {
  const toasts = project(on, ORACLE)

  for (const content of GOOD) {
    expect((await write($, FILE, content)).context, content).toBeUndefined()
  }

  expect(toasts).toEqual([])
})

test('judges only what an Edit adds, and only in the right files', async ($, on) => {
  project(on, ORACLE, { [FILE.slice('/work/'.length)]: `${KEPT}\nint n = 1;` })

  const kept = await edit($, FILE, 'int n = 1;', 'int n = 2;')
  expect(kept.context).toBeUndefined()

  const added = await edit($, FILE, 'int n = 1;', BAD[0]?.[0] ?? '')
  expect(added.context?.[0]).toContain(BAD[0]?.[1])

  const other = await write($, '/work/README.md', BAD[0]?.[0] ?? '')
  expect(other.context).toBeUndefined()
})

test('does nothing when the stack is absent', async ($, on) => {
  const toasts = project(on, {})

  for (const [content] of BAD) {
    expect((await write($, FILE, content)).context, content).toBeUndefined()
  }

  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = project(on, ORACLE)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await write($, FILE, "DELETE FROM orders;")
  expect(toasts[0]).toBe("sql-no-where-note: DELETE FROM orders without WHERE em db/fix_status.sql, o Claude foi avisado")
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const toasts = project(on, ORACLE)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await write($, FILE, 'UPDATE orders SET status = 1;')
  expect(toasts[0]).toBe('sql-no-where-note: UPDATE orders without WHERE en db/fix_status.sql, se avisó a Claude')
})

test('a Java project without an Oracle driver is left alone', async ($, on) => {
  const toasts = project(on, JAVA)

  expect((await write($, FILE, 'DELETE FROM orders;')).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('detects Oracle from oracledb in package.json', async ($, on) => {
  project(on, { 'package.json': JSON.stringify({ dependencies: { oracledb: '6' } }) })

  expect((await write($, FILE, 'DELETE FROM orders;')).context?.[0]).toContain('DELETE FROM orders without WHERE')
})

test('an invalid package.json detects nothing', async ($, on) => {
  const toasts = project(on, { 'package.json': '{ broken' })

  expect((await write($, FILE, 'DELETE FROM orders;')).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('lists every statement without WHERE in one note, and spares a WHERE CURRENT OF', async ($, on) => {
  const toasts = project(on, ORACLE)
  const script = 'DELETE FROM a;\nUPDATE "B" SET x = 1;\nUPDATE c SET y = 2 WHERE CURRENT OF cur;\n/* DELETE FROM d; */'

  const ran = await write($, FILE, script)
  expect(ran.context).toHaveLength(1)
  expect(ran.context?.[0]).toContain('now has DELETE FROM a without WHERE, UPDATE "B" without WHERE.')
  expect(ran.context?.[0]).not.toContain('UPDATE c')
  expect(ran.context?.[0]).not.toContain('DELETE FROM d')
  expect(toasts).toHaveLength(1)
})

test('rewriting a statement in another case is not new, one on a second table is', async ($, on) => {
  project(on, ORACLE, { [FILE.slice('/work/'.length)]: 'DELETE FROM orders;\n-- end' })

  expect((await edit($, FILE, 'DELETE FROM orders;', 'delete from ORDERS;')).context).toBeUndefined()
  expect((await edit($, FILE, '-- end', 'DELETE FROM lines;')).context?.[0]).toContain('DELETE FROM lines without WHERE')
})

test('adds no note when the tool reported an error', async ($, on) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) =>
    e.path.replaceAll('\\', '/').endsWith('/work/pom.xml') ? { value: ORACLE['pom.xml'] } : { deny: 'ENOENT' },
  )
  on('tool.call', { tool: 'Write' }, () => ({ isError: true, result: 'disk full' }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  expect((await write($, FILE, 'DELETE FROM orders;')).context).toBeUndefined()
  expect(toasts).toEqual([])
})
