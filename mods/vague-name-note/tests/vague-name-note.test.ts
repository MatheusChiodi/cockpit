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
    "export const data2 = load()\n",
    "data2"
  ],
  [
    "/work/src/a.ts",
    "export function foo() {}\nexport async function doStuff() {}\n",
    "foo"
  ],
  [
    "/work/src/a.tsx",
    "export default function tmp() { return null }\n",
    "tmp"
  ]
]

const FINE: readonly [string, string][] = [
  [
    "/work/src/a.ts",
    "const tmp = 1\nfunction foo() {}\nconst data2 = 2\n"
  ],
  [
    "/work/src/a.ts",
    "export const database = 1\nexport function dataset() {}\nexport const fooBarConfig = {}\n"
  ],
  [
    "/work/src/a.tsx",
    "export const Bar = () => null\nexport class Foo {}\n"
  ],
  [
    "/work/src/a.ts",
    "export const data = 1\nexport const x = 2\nexport const info = 3\n"
  ],
  [
    "/work/src/a.ts",
    "// export const tmp = 1\nconst s = 'export const foo = 1'\n"
  ],
  [
    "/work/notes.md",
    "export const tmp = 1\n"
  ]
]

test('tells Claude what the edit added and shows a toast', async ($, on) => {
  const toasts = project(on)

  for (const [file, content, detail] of FLAGGED) {
    const answer = await write($, file, content)
    expect(answer.context?.[0], detail).toContain(detail)
    expect(answer.context?.[0], detail).toContain('vague-name-note: ')
  }

  expect(toasts).toHaveLength(FLAGGED.length)
  expect(toasts[0]).toBe("vague-name-note: placeholder export data2 in src/a.ts, Claude was told")
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
    "/work/src/a.ts": "export const user = 1\n",
    "/work/src/b.ts": "export const tmp = 1\nconst n = 1\n",
  })

  const added = await edit($, "/work/src/a.ts", "export const user = 1", "export const user = 1\nexport const stuff = 2")
  expect(added.context?.[0]).toContain("stuff")
  expect(toasts).toHaveLength(1)

  const kept = await edit($, "/work/src/b.ts", "const n = 1", "const n = 2")
  expect(kept.context).toBeUndefined()
  expect(toasts).toHaveLength(1)
})

test('leaves an Edit alone when the file cannot be read', async ($, on) => {
  const toasts = project(on)

  const answer = await edit($, "/work/src/a.ts", "export const user = 1", "export const user = 1\nexport const stuff = 2")
  expect(answer.context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = project(on)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await write($, FLAGGED[0]?.[0] ?? '', FLAGGED[0]?.[1] ?? '')
  expect(toasts[0]).toBe("vague-name-note: export provisório data2 em src/a.ts, o Claude foi avisado")
})

test('adds nothing when the write is denied or fails', async ($, on) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', () => ({ deny: 'ENOENT' }))
  on('tool.call', { tool: 'Write' }, (_$, e) => (e.content.includes('tmp') ? { deny: 'no' } : { result: undefined as never, isError: true }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  expect((await write($, '/work/src/a.ts', 'export const tmp = 1\n')).deny).toBe('no')
  expect((await write($, '/work/src/a.ts', 'export const foo = 1\n')).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('lists every placeholder export in the note and the first in the toast', async ($, on) => {
  const toasts = project(on)

  const answer = await write($, '/work/src/a.ts', 'export interface baz {}\nexport type qux = 1\nexport enum temp { A }\n')
  expect(answer.context?.[0]).toContain('placeholder name: baz, qux, temp.')
  expect(toasts).toEqual(['vague-name-note: placeholder export baz in src/a.ts, Claude was told'])
})

test('ignores exports inside block comments and template strings', async ($, on) => {
  const toasts = project(on)

  const answer = await write($, '/work/src/a.ts', '/*\nexport const tmp = 1\n*/\nconst t = `\nexport const foo = 2\n`\n')
  expect(answer.context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('applies replace_all before judging an Edit', async ($, on) => {
  const toasts = project(on, { '/work/src/r.ts': 'export const NAME = 1\n' })

  const answer = await $.tool.call({ tool: 'Edit', file_path: '/work/src/r.ts', old_string: 'NAME', new_string: 'stuff', replace_all: true, tool_use_id: 'ra' })
  expect(answer.context?.[0]).toContain('stuff')
  expect(toasts).toHaveLength(1)
})

test('keeps the context a hook beneath already added', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', () => ({ deny: 'ENOENT' }))
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never, context: ['from below'] }))
  on('ui.toast', () => ({ value: undefined }))

  const answer = await write($, '/work/src/a.mjs', 'export let blah = 1\n')
  expect(answer.context?.[0]).toBe('from below')
  expect(answer.context?.[1]).toContain('vague-name-note: src/a.mjs now exports a placeholder name: blah.')
})

test('leaves Python and other languages alone', async ($, on) => {
  const toasts = project(on)

  expect((await write($, '/work/src/a.py', 'export const tmp = 1\n')).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('speaks Spanish when the hub says so', async ($, on) => {
  const toasts = project(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await write($, '/work/src/a.ts', 'export function myFunc() {}\n')
  expect(toasts[0]).toBe('vague-name-note: export provisional myFunc en src/a.ts, se avisó a Claude')
})
