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
const BAD: readonly (readonly [string, string])[] = [["class A {\n  @Autowired\n  private UserService users;\n}","constructor"],["class A {\n  @Autowired(required = false) @Qualifier(\"x\") Map<String, List<Foo>> foos;\n}","@Autowired on the field foos"],["class A {\n  @Inject private Repo repo = null;\n}","@Autowired on the field repo"]]
const GOOD: readonly string[] = ["class A {\n  private final UserService users;\n  @Autowired\n  A(UserService users) { this.users = users; }\n}","class A {\n  private UserService users;\n  @Autowired\n  public void setUsers(UserService users) { this.users = users; }\n}","class A {\n  // @Autowired private Foo foo;\n  private final Foo foo;\n}"]
const KEPT = "class A {\n  @Autowired private Old old;\n}"

test('notes what a Write adds, with the fix', async ($, on) => {
  const toasts = project(on, JAVA)

  for (const [content, expected] of BAD) {
    const ran = await write($, FILE, content)
    expect(ran.context?.[0], content).toContain('field-injection-note: ')
    expect(ran.context?.[0], content).toContain(expected)
  }

  expect(toasts.length).toBe(BAD.length)
  expect(toasts[0]).toContain('field-injection-note: ')
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

  await write($, FILE, "class A {\n  @Autowired private Repo repo;\n}")
  expect(toasts[0]).toBe("field-injection-note: @Autowired on the field repo em src/main/java/App.java, o Claude foi avisado")
})

test('leaves test sources and non-Java files alone', async ($, on) => {
  const toasts = project(on, JAVA)

  expect((await write($, '/work/src/test/java/AppTest.java', BAD[0]?.[0] ?? '')).context).toBeUndefined()
  expect((await write($, '/work/src/main/kotlin/App.kt', BAD[0]?.[0] ?? '')).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('detects a Gradle project as Java', async ($, on) => {
  const toasts = project(on, { 'build.gradle.kts': 'plugins { java }' })

  const ran = await write($, FILE, BAD[2]?.[0] ?? '')
  expect(ran.context?.[0]).toContain('@Autowired on the field repo')
  expect(toasts.length).toBe(1)
})

test('a Write that keeps a field the file already had says nothing', async ($, on) => {
  const toasts = project(on, JAVA, { [FILE.slice('/work/'.length)]: KEPT })

  expect((await write($, FILE, `${KEPT}\n// more`)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('says nothing when the call is denied or fails', async ($, on) => {
  const toasts: string[] = []
  let answer: any = { deny: 'no' }
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) => (e.path.endsWith('pom.xml') ? { value: JAVA['pom.xml'] } : { deny: 'ENOENT' }))
  on('tool.call', { tool: 'Write' }, () => answer)
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  expect((await write($, FILE, BAD[0]?.[0] ?? '')).context).toBeUndefined()

  answer = { result: undefined, isError: true }
  expect((await write($, FILE, BAD[0]?.[0] ?? '')).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('an Edit with replace_all counts every new field', async ($, on) => {
  project(on, JAVA, { [FILE.slice('/work/'.length)]: 'class A {\n  // slot\n  // slot\n}' })

  counter += 1
  const ran = await $.tool.call({
    tool: 'Edit',
    file_path: FILE,
    old_string: '// slot',
    new_string: '@Inject private Repo repo;',
    replace_all: true,
    tool_use_id: `e-${counter}`,
  })

  expect(ran.context?.[0]).toContain('@Autowired on the field repo')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const toasts = project(on, JAVA)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await write($, FILE, "class A {\n  @Autowired private Repo repo;\n}")
  expect(toasts[0]).toBe('field-injection-note: @Autowired on the field repo en src/main/java/App.java, se avisó a Claude')
})
