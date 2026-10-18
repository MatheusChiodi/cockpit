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

const FILE = "/work/src/main/java/App.java"
const BAD: readonly (readonly [string, string])[] = [["class A { void f() throws Exception {\n  Connection conn = ds.getConnection();\n  conn.close();\n} }","try (Connection conn = ds.getConnection()"],["class A { void f() throws Exception {\n  BufferedReader in = new BufferedReader(new FileReader(path));\n} }","in opened with new BufferedReader outside try-with-resources"],["class A { void f() throws Exception {\n  final PreparedStatement ps = conn.prepareStatement(sql);\n} }","ps opened with prepareStatement() outside try-with-resources"]]
const GOOD: readonly string[] = ["class A { void f() throws Exception {\n  try (Connection conn = ds.getConnection();\n       PreparedStatement ps = conn.prepareStatement(sql)) {\n    ps.execute();\n  }\n} }","class A { void f() throws Exception {\n  try (var in = new FileInputStream(path)) { in.read(); }\n} }","class A { private Connection shared = ds.getConnection(); }","class A { Connection f() throws Exception {\n  return ds.getConnection();\n} }","class A { void f() {\n  // Connection conn = ds.getConnection();\n} }"]
const KEPT = "class A { void f() throws Exception {\n  Scanner old = new Scanner(System.in);\n} }"

test('notes what a Write adds, with the fix', async ($, on) => {
  const toasts = project(on, JAVA)

  for (const [content, expected] of BAD) {
    const ran = await write($, FILE, content)
    expect(ran.context?.[0], content).toContain('try-resources-note: ')
    expect(ran.context?.[0], content).toContain(expected)
  }

  expect(toasts.length).toBe(BAD.length)
  expect(toasts[0]).toContain('try-resources-note: ')
  expect(toasts[0]).toContain('Claude was told')
})

test('stays silent for correct look-alike code', async ($, on) => {
  const toasts = project(on, JAVA)

  for (const content of GOOD) {
    expect((await write($, FILE, content)).context, content).toBeUndefined()
  }

  expect(toasts).toEqual([])
})

test('judges only what an Edit adds, and only in the right files', async ($, on) => {
  project(on, JAVA, { [FILE.slice('/work/'.length)]: `${KEPT}\nint n = 1;` })

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
  const toasts = project(on, JAVA)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await write($, FILE, "class A { void f() throws Exception {\n  Connection conn = ds.getConnection();\n} }")
  expect(toasts[0]).toBe("try-resources-note: conn opened with getConnection() outside try-with-resources em src/main/java/App.java, o Claude foi avisado")
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const toasts = project(on, JAVA)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await write($, FILE, "class A { void f() throws Exception {\n  Connection conn = ds.getConnection();\n} }")
  expect(toasts[0]).toBe("try-resources-note: conn opened with getConnection() outside try-with-resources en src/main/java/App.java, se avisó a Claude")
})

test('recognises a Gradle build as a Java project', async ($, on) => {
  const toasts = project(on, { 'build.gradle.kts': 'plugins { java }' })

  const ran = await write($, FILE, BAD[1]?.[0] ?? '')
  expect(ran.context?.[0]).toContain(BAD[1]?.[1])
  expect(toasts.length).toBe(1)
})

test('stays silent when the tool beneath denies the call', async ($, on) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) =>
    e.path.replaceAll('\\', '/').endsWith('/work/pom.xml') ? { value: JAVA['pom.xml'] } : { deny: 'ENOENT' },
  )
  on('tool.call', { tool: 'Write' }, () => ({ deny: 'blocked below' }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  const ran = await write($, FILE, BAD[0]?.[0] ?? '')
  expect(ran.deny).toBe('blocked below')
  expect(ran.context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('judges an Edit by its own strings when the file cannot be read', async ($, on) => {
  project(on, JAVA)

  const ran = await edit($, FILE, 'int n = 1;', BAD[2]?.[0] ?? '')
  expect(ran.context?.[0]).toContain(BAD[2]?.[1])
})

test('lists every distinct finding of one write in a single note', async ($, on) => {
  const toasts = project(on, JAVA)
  const both =
    'class A { void f() throws Exception {\n  Connection conn = ds.getConnection();\n  Scanner in = new Scanner(System.in);\n} }'

  const ran = await write($, FILE, both)
  expect(ran.context?.length).toBe(1)
  expect(ran.context?.[0]).toContain('conn opened with getConnection()')
  expect(ran.context?.[0]).toContain('in opened with new Scanner')
  expect(toasts.length).toBe(1)
})

test('ignores openings inside string literals and block comments', async ($, on) => {
  project(on, JAVA)
  const quoted =
    'class A { void f() {\n  String s = "Connection c = ds.getConnection();";\n  /* Scanner in = new Scanner(System.in); */\n} }'

  expect((await write($, FILE, quoted)).context).toBeUndefined()
})
