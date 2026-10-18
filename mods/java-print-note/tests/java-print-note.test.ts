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
const BAD: readonly (readonly [string, string])[] = [["class A { void f() { System.out.println(\"x\"); } }","System.out.println"],["class A { void f() { try { g(); } catch (Exception e) { e.printStackTrace(); } } }","printStackTrace()"],["class A { void f() { System.err.printf(\"%s\", 1); } }","System.err.printf"]]
const GOOD: readonly string[] = ["class A { void f() { log.info(\"System.out.println is banned\"); } }","class A { void f() { // System.out.println(\"x\")\n } }","class A { void f() { log.error(\"failed\", e); } }","class A { void f() { out.println(\"x\"); } }"]
const KEPT = "class A { void f() { System.out.println(\"old\"); } }"

test('notes what a Write adds, with the fix', async ($, on) => {
  const toasts = project(on, JAVA)

  for (const [content, expected] of BAD) {
    const ran = await write($, FILE, content)
    expect(ran.context?.[0], content).toContain('java-print-note: ')
    expect(ran.context?.[0], content).toContain(expected)
  }

  expect(toasts.length).toBe(BAD.length)
  expect(toasts[0]).toContain('java-print-note: ')
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

  await write($, FILE, "class A { void f() { System.out.println(\"x\"); } }")
  expect(toasts[0]).toBe("java-print-note: System.out.println em src/main/java/App.java, o Claude foi avisado")
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const toasts = project(on, JAVA)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await write($, FILE, BAD[2]?.[0] ?? '')
  expect(toasts[0]).toBe('java-print-note: System.err.printf en src/main/java/App.java, se avisó a Claude')
})

test('leaves test sources alone', async ($, on) => {
  const toasts = project(on, JAVA)

  expect((await write($, '/work/src/test/java/AppTest.java', BAD[0]?.[0] ?? '')).context).toBeUndefined()
  expect((await write($, 'C:\\work\\src\\test\\java\\AppTest.java', BAD[0]?.[0] ?? '')).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('ignores prints inside block comments and text blocks', async ($, on) => {
  project(on, JAVA)
  const hidden = 'class A {\n  /* System.out.println("x"); */\n  String s = """\n    System.out.println("y");\n    """;\n}'

  expect((await write($, FILE, hidden)).context).toBeUndefined()
})

test('recognises a Gradle build and lists every distinct print in one note', async ($, on) => {
  const toasts = project(on, { 'build.gradle.kts': 'plugins { java }' })
  const many = 'class A { void f() { System.out.print("a"); System.out.print("b"); System.err.println("c"); } }'

  const ran = await write($, FILE, many)
  expect(ran.context).toHaveLength(1)
  expect(ran.context?.[0]).toContain('now has System.out.print, System.err.println.')
  expect(toasts).toHaveLength(1)
})

test('a second print of the same kind added by an Edit is still noted', async ($, on) => {
  project(on, JAVA, { [FILE.slice('/work/'.length)]: `${KEPT}\nint n = 1;` })

  const ran = await edit($, FILE, 'int n = 1;', 'void g() { System.out.println("new"); }')
  expect(ran.context?.[0]).toContain('System.out.println')
})

test('replace_all applies the edit everywhere before judging', async ($, on) => {
  project(on, JAVA, { [FILE.slice('/work/'.length)]: 'class A { void f() { log.info("a"); log.info("b"); } }' })

  const ran = await $.tool.call({
    tool: 'Edit',
    file_path: FILE,
    old_string: 'log.info',
    new_string: 'System.out.println',
    replace_all: true,
    tool_use_id: 'e-all',
  })
  expect(ran.context?.[0]).toContain('System.out.println')
})

test('adds no note when the tool reported an error', async ($, on) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) =>
    e.path.replaceAll('\\', '/').endsWith('/work/pom.xml') ? { value: JAVA['pom.xml'] } : { deny: 'ENOENT' },
  )
  on('tool.call', { tool: 'Write' }, () => ({ isError: true, result: 'disk full' }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  const ran = await write($, FILE, BAD[0]?.[0] ?? '')
  expect(ran.isError).toBe(true)
  expect(ran.context).toBeUndefined()
  expect(toasts).toEqual([])
})
