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
const BAD: readonly (readonly [string, string])[] = [["class A {\n  @Transactional\n  private void save(Order o) {}\n}","private method save()"],["class A {\n  @Transactional(rollbackFor = Exception.class)\n  @Override\n  private static int count() { return 1; }\n}","private method count()"],["class A {\n  @Transactional public final void pay() {}\n}","final method pay()"]]
const GOOD: readonly string[] = ["class A {\n  @Transactional\n  public void save(Order o) {}\n}","@Transactional\npublic class A {\n  private void helper() {}\n}","class A {\n  @Transactional(readOnly = true)\n  List<Order> all() { return null; }\n  private void helper() {}\n}","class A {\n  // @Transactional private void save() {}\n}"]
const KEPT = "class A {\n  @Transactional private void old() {}\n}"

test('notes what a Write adds, with the fix', async ($, on) => {
  const toasts = project(on, JAVA)

  for (const [content, expected] of BAD) {
    const ran = await write($, FILE, content)
    expect(ran.context?.[0], content).toContain('transactional-private-note: ')
    expect(ran.context?.[0], content).toContain(expected)
  }

  expect(toasts.length).toBe(BAD.length)
  expect(toasts[0]).toContain('transactional-private-note: ')
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

  await write($, FILE, "class A {\n  @Transactional\n  private void save() {}\n}")
  expect(toasts[0]).toBe("transactional-private-note: @Transactional on the private method save() em src/main/java/App.java, o Claude foi avisado")
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const toasts = project(on, JAVA)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await write($, FILE, "class A {\n  @Transactional\n  private void save() {}\n}")
  expect(toasts[0]).toBe('transactional-private-note: @Transactional on the private method save() en src/main/java/App.java, se avisó a Claude')
})

test('recognizes a Gradle project', async ($, on) => {
  project(on, { 'build.gradle.kts': 'plugins { java }' })

  const ran = await write($, FILE, "class A {\n  @Transactional static void run() {}\n}")
  expect(ran.context?.[0]).toContain('@Transactional on the static method run()')
})

test('ignores the annotation inside strings and block comments', async ($, on) => {
  const toasts = project(on, JAVA)

  const quoted = 'class A {\n  String s = "@Transactional private void x() {}";\n}'
  const commented = 'class A {\n  /* @Transactional\n  private void x() {} */\n}'
  expect((await write($, FILE, quoted)).context).toBeUndefined()
  expect((await write($, FILE, commented)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('a protected method is fine', async ($, on) => {
  project(on, JAVA)

  expect((await write($, FILE, 'class A {\n  @Transactional\n  protected void save() {}\n}')).context).toBeUndefined()
})

test('leaves a denied write alone', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) => (fileOf(e.path) === 'pom.xml' ? { value: '<project/>' } : { deny: 'ENOENT' }))
  on('tool.call', { tool: 'Write' }, () => ({ deny: 'nope' }))

  const ran = await write($, FILE, BAD[0]?.[0] ?? '')
  expect(ran.deny).toBe('nope')
  expect(ran.context).toBeUndefined()
})

test('lists every new finding in one note', async ($, on) => {
  project(on, JAVA)

  const ran = await write($, FILE, 'class A {\n  @Transactional private void a() {}\n  @Transactional final void b() {}\n}')
  expect(ran.context?.[0]).toContain('private method a(), @Transactional on the final method b()')
})
