import { expect, test } from 'claude-code/testing'

const slashed = (path: string) => path.replaceAll('\\', '/')

let counter = 0

// A project at /work with `files` by path; returns the toasts the person saw.
const project = (on: any, files: Record<string, string> = {}) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) => {
    const path = slashed(e.path)
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

const write = ($: any, file_path: string, content: string) =>
  $.tool.call({ tool: 'Write', file_path, content, tool_use_id: `w${(counter += 1)}` })

const edit = ($: any, file_path: string, old_string: string, new_string: string) =>
  $.tool.call({ tool: 'Edit', file_path, old_string, new_string, tool_use_id: `e${(counter += 1)}` })

const FLAGGED: readonly [string, string, string][] = [
  [
    "/work/src/a.ts",
    "async function save(u: User) {}\nfunction run(u: User) {\n  save(u)\n  other()\n}\n",
    "save(u)"
  ],
  [
    "/work/src/a.ts",
    "function ping() {\n  fetch('/api/ping');\n}\n",
    "fetch('/api/ping')"
  ],
  [
    "/work/src/a.ts",
    "const load = async () => 1\nexport function boot() {\n  if (ready)\n    load()\n}\n",
    "load()"
  ]
]

const FINE: readonly [string, string][] = [
  [
    "/work/src/a.ts",
    "async function save(u: User) {}\nasync function run(u: User) {\n  await save(u)\n  void save(u)\n  save(u).catch(report)\n  const p = save(u)\n  return save(u)\n}\n"
  ],
  [
    "/work/src/a.ts",
    "async function save(u: User) {}\nfunction run(u: User) {\n  save(u)\n    .then(done)\n    .catch(report)\n}\n"
  ],
  [
    "/work/src/a.ts",
    "function save(u: User) {}\nfunction run(u: User) {\n  save(u)\n}\n"
  ],
  [
    "/work/src/a.ts",
    "class A {\n  async save(u: User) {}\n  async run() {\n    const x = await Promise.all([\n      this.save(1),\n      this.save(2),\n    ])\n  }\n}\n"
  ],
  [
    "/work/src/a.ts",
    "async function save(u: User) {}\nconst note = 'save(u)'\n// save(u)\n"
  ],
  [
    "/work/notes.md",
    "async function save() {}\nsave()\n"
  ]
]

test('tells Claude what the edit added and shows a toast', async ($, on) => {
  const toasts = project(on)

  for (const [file, content, detail] of FLAGGED) {
    const answer = await write($, file, content)
    expect(answer.context?.[0], detail).toContain(detail)
    expect(answer.context?.[0], detail).toContain('unawaited-promise-note: ')
  }

  expect(toasts).toHaveLength(FLAGGED.length)
  expect(toasts[0]).toBe("unawaited-promise-note: promise dropped (save(u)) in src/a.ts, Claude was told")
})

test('stays silent for look-alikes and files it does not read', async ($, on) => {
  const toasts = project(on)

  for (const [file, content] of FINE) {
    const answer = await write($, file, content)
    expect(answer.context, content).toBeUndefined()
  }

  expect(toasts).toEqual([])
})

test('ignores tests, fixtures, vendored and generated paths', async ($, on) => {
  const toasts = project(on)
  const [file, content] = FLAGGED[0] ?? ['', '']
  const ext = file.slice(file.lastIndexOf('.'))

  for (const skipped of [`/work/src/a.test${ext}`, `/work/tests/a${ext}`, `/work/node_modules/x/a${ext}`, `/work/dist/a${ext}`, `/work/src/a.generated${ext}`]) {
    expect((await write($, skipped, content)).context, skipped).toBeUndefined()
  }

  expect(toasts).toEqual([])
})

test('judges only what an Edit adds', async ($, on) => {
  const toasts = project(on, {
    "/work/src/a.ts": "async function save(u: User) {}\nasync function run(u: User) {\n  await save(u)\n}\n",
    "/work/src/b.ts": "async function save(u: User) {}\nfunction run(u: User) {\n  save(u)\n}\nconst n = 1\n",
  })

  const added = await edit($, "/work/src/a.ts", "  await save(u)", "  save(u)")
  expect(added.context?.[0]).toContain("save(u)")
  expect(toasts).toHaveLength(1)

  const kept = await edit($, "/work/src/b.ts", "const n = 1", "const n = 2")
  expect(kept.context).toBeUndefined()
  expect(toasts).toHaveLength(1)
})

test('leaves an Edit alone when the file cannot be read', async ($, on) => {
  const toasts = project(on)

  const answer = await edit($, "/work/src/a.ts", "  await save(u)", "  save(u)")
  expect(answer.context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = project(on)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await write($, FLAGGED[0]?.[0] ?? '', FLAGGED[0]?.[1] ?? '')
  expect(toasts[0]).toBe("unawaited-promise-note: promise descartada (save(u)) em src/a.ts, o Claude foi avisado")
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const toasts = project(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await write($, FLAGGED[0]?.[0] ?? '', FLAGGED[0]?.[1] ?? '')
  expect(toasts[0]).toBe('unawaited-promise-note: promesa descartada (save(u)) en src/a.ts, se avisó a Claude')
})

test('shortens a long dropped call to its name', async ($, on) => {
  const toasts = project(on)
  const long = `async function save(...a: unknown[]) {}\nfunction run() {\n  save(${'"x", '.repeat(15)}"y");\n}\n`

  const answer = await write($, '/work/src/a.mjs', long)
  expect(answer.context?.[0]).toContain('save(…)')
  expect(toasts[0]).toContain('promise dropped (save(…))')
})

test('flags a dropped this.method() of an async method', async ($, on) => {
  project(on)
  const code = 'class A {\n  async save() {}\n  run() {\n    this.save();\n  }\n}\n'

  expect((await write($, '/work/src/a.js', code)).context?.[0]).toContain('this.save()')
})

test('a replace_all Edit counts every call it adds', async ($, on) => {
  const toasts = project(on, {
    '/work/src/a.ts': 'async function save(u: User) {}\nasync function run(u: User) {\n  await save(u)\n  await save(u)\n}\n',
  })

  const answer = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/a.ts',
    old_string: 'await save(u)',
    new_string: 'save(u)',
    replace_all: true,
    tool_use_id: `e${(counter += 1)}`,
  })
  expect(answer.context?.[0]).toContain('drops its promise: save(u).')
  expect(toasts).toHaveLength(1)
})

test('passes a denied Write through without a note', async ($, on) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', () => ({ deny: 'ENOENT' }))
  on('tool.call', { tool: 'Write' }, () => ({ deny: 'read only' }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  const answer = await write($, FLAGGED[0]?.[0] ?? '', FLAGGED[0]?.[1] ?? '')
  expect(answer.deny).toBe('read only')
  expect(toasts).toEqual([])
})

test('keeps the context the tool beneath already returned', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', () => ({ deny: 'ENOENT' }))
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never, context: ['from below'] }))
  on('ui.toast', () => ({ value: undefined }))

  const answer = await write($, FLAGGED[1]?.[0] ?? '', FLAGGED[1]?.[1] ?? '')
  expect(answer.context?.[0]).toBe('from below')
  expect(answer.context?.[1]).toContain('unawaited-promise-note: ')
})
