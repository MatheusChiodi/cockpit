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
    "/** Adds two numbers. */\nexport function add(a: number, b: number) { return a + b }\n\n/** Subtracts. */\nexport function sub(a: number, b: number) { return a - b }\n\nexport function mul(a: number, b: number) { return a * b }\n",
    "mul"
  ],
  [
    "/work/src/a.ts",
    "// Reads a user.\nexport const readUser = async (id: string) => id\n// Saves a user.\nexport const saveUser = (u: User) => u\nexport const dropUser = (id: string) => id\n",
    "dropUser"
  ]
]

const FINE: readonly [string, string][] = [
  [
    "/work/src/a.ts",
    "export function add(a: number, b: number) { return a + b }\nexport function sub(a: number, b: number) { return a - b }\nexport function mul(a: number, b: number) { return a * b }\n"
  ],
  [
    "/work/src/a.ts",
    "/** Adds. */\nexport function add() {}\n/** Subs. */\nexport function sub() {}\n/** Muls. */\nexport function mul() {}\n"
  ],
  [
    "/work/src/a.ts",
    "/** Adds. */\nexport function add() {}\n/** Subs. */\nexport function sub() {}\nfunction helper() {}\nexport const LIMIT = 5\n"
  ],
  [
    "/work/src/a.ts",
    "/** Adds. */\nexport function add() {}\nexport function mul() {}\n"
  ],
  [
    "/work/notes.md",
    "/** a */\nexport function a() {}\n/** b */\nexport function b() {}\nexport function c() {}\n"
  ]
]

test('tells Claude what the edit added and shows a toast', async ($, on) => {
  const toasts = project(on)

  for (const [file, content, detail] of FLAGGED) {
    const answer = await write($, file, content)
    expect(answer.context?.[0], detail).toContain(detail)
    expect(answer.context?.[0], detail).toContain('doc-missing-note: ')
  }

  expect(toasts).toHaveLength(FLAGGED.length)
  expect(toasts[0]).toBe("doc-missing-note: mul has no doc comment in src/a.ts, Claude was told")
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
    "/work/src/a.ts": "/** Adds. */\nexport function add() {}\n\n/** Subs. */\nexport function sub() {}\n",
    "/work/src/b.ts": "/** Adds. */\nexport function add() {}\n/** Subs. */\nexport function sub() {}\nexport function mul() {}\nconst n = 1\n",
  })

  const added = await edit($, "/work/src/a.ts", "export function sub() {}", "export function sub() {}\n\nexport function mul() {}")
  expect(added.context?.[0]).toContain("mul")
  expect(toasts).toHaveLength(1)

  const kept = await edit($, "/work/src/b.ts", "const n = 1", "const n = 2")
  expect(kept.context).toBeUndefined()
  expect(toasts).toHaveLength(1)
})

test('leaves an Edit alone when the file cannot be read', async ($, on) => {
  const toasts = project(on)

  const answer = await edit($, "/work/src/a.ts", "export function sub() {}", "export function sub() {}\n\nexport function mul() {}")
  expect(answer.context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = project(on)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await write($, FLAGGED[0]?.[0] ?? '', FLAGGED[0]?.[1] ?? '')
  expect(toasts[0]).toBe("doc-missing-note: mul sem comentário de documentação em src/a.ts, o Claude foi avisado")
})

test('counts multi-line doc blocks, async defaults and typed arrows', async ($, on) => {
  project(on)

  const content = [
    '/**',
    ' * Loads the user.',
    ' */',
    'export default async function load() {}',
    '/** Typed. */',
    'export const typed: Handler = (req) => req',
    'export const bare = function () {}',
  ].join('\n')

  const answer = await write($, '/work/src/h.ts', content)
  expect(answer.context?.[0]).toContain('src/h.ts now exports a function with no doc comment')
  expect(answer.context?.[0]).toContain("file's other exports have one: bare.")
})

test('needs at least three out of four of the other exports documented', async ($, on) => {
  const toasts = project(on)

  const below = ['/** a */', 'export function a() {}', '/** b */', 'export function b() {}', 'export function c() {}', 'export function d() {}', 'export function e() {}'].join('\n')
  expect((await write($, '/work/src/below.ts', below)).context).toBeUndefined()

  const at = ['/** a */', 'export function a() {}', '/** b */', 'export function b() {}', '/** c */', 'export function c() {}', 'export function d() {}', 'export function e() {}'].join('\n')
  expect((await write($, '/work/src/at.ts', at)).context?.[0]).toContain(': d, e.')
  expect(toasts).toHaveLength(1)
})

test('a blank line between the comment and the export breaks the link', async ($, on) => {
  project(on)

  const content = ['/** a */', 'export function a() {}', '/** b */', 'export function b() {}', '/** c */', '', 'export function c() {}'].join('\n')
  expect((await write($, '/work/src/gap.ts', content)).context?.[0]).toContain(': c.')
})

test('says nothing about a write that was refused beneath', async ($, on) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', () => ({ deny: 'ENOENT' }))
  on('tool.call', { tool: 'Write' }, () => ({ deny: 'not allowed' }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  const answer = await write($, FLAGGED[0]?.[0] ?? '', FLAGGED[0]?.[1] ?? '')
  expect(answer.deny).toBe('not allowed')
  expect(toasts).toEqual([])
})

test('lists every undocumented export it adds, toasting the first', async ($, on) => {
  const toasts = project(on)

  const content = ['/** a */', 'export function a() {}', '/** b */', 'export function b() {}', '/** c */', 'export function c() {}', '/** d */', 'export function d() {}', '/** e */', 'export function e() {}', '/** f */', 'export function f() {}', 'export function x() {}', 'export function y() {}'].join('\n')
  const answer = await write($, '/work/src/many.ts', content)

  expect(answer.context?.[0]).toContain(': x, y.')
  expect(toasts).toEqual(['doc-missing-note: x has no doc comment in src/many.ts, Claude was told'])
})

test('speaks Spanish when the hub language is es', async ($, on) => {
  const toasts = project(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await write($, FLAGGED[1]?.[0] ?? '', FLAGGED[1]?.[1] ?? '')
  expect(toasts[0]).toBe('doc-missing-note: dropUser sin comentario de documentación en src/a.ts, se avisó a Claude')
  expect(answer.context?.[0]).toContain('Add a short doc comment above it in the same style.')
})
