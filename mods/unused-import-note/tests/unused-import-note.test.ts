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
    "import { readFile, writeFile } from 'node:fs/promises'\n\nexport const load = (p: string) => readFile(p)\n",
    "writeFile"
  ],
  [
    "/work/src/a.ts",
    "import path from 'node:path'\nimport * as os from 'node:os'\nexport const x = path.sep\n",
    "os"
  ]
]

const FINE: readonly [string, string][] = [
  [
    "/work/src/a.ts",
    "import { readFile } from 'node:fs/promises'\nexport const load = (p: string) => readFile(p)\n"
  ],
  [
    "/work/src/a.ts",
    "import type { User } from './types'\nexport const f = (u: User) => u\nimport { Card } from './card'\nexport const g = () => <Card />\n"
  ],
  [
    "/work/src/a.ts",
    "import { helper } from './h'\nexport { helper }\nimport './styles.css'\nimport React from 'react'\n"
  ],
  [
    "/work/src/a.ts",
    "import { a as b } from './h'\nimport * as ns from './n'\nexport const c = [...b, ns]\n"
  ],
  [
    "/work/notes.md",
    "import { unused } from './h'\n"
  ]
]

test('tells Claude what the edit added and shows a toast', async ($, on) => {
  const toasts = project(on)

  for (const [file, content, detail] of FLAGGED) {
    const answer = await write($, file, content)
    expect(answer.context?.[0], detail).toContain(detail)
    expect(answer.context?.[0], detail).toContain('unused-import-note: ')
  }

  expect(toasts).toHaveLength(FLAGGED.length)
  expect(toasts[0]).toBe("unused-import-note: unused import writeFile in src/a.ts, Claude was told")
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
    "/work/src/a.ts": "import { readFile, stat } from 'node:fs/promises'\nexport const load = (p: string) => [readFile(p), stat(p)]\n",
    "/work/src/b.ts": "import { stat } from 'node:fs/promises'\nconst n = 1\n",
  })

  const added = await edit($, "/work/src/a.ts", "[readFile(p), stat(p)]", "readFile(p)")
  expect(added.context?.[0]).toContain("stat")
  expect(toasts).toHaveLength(1)

  const kept = await edit($, "/work/src/b.ts", "const n = 1", "const n = 2")
  expect(kept.context).toBeUndefined()
  expect(toasts).toHaveLength(1)
})

test('leaves an Edit alone when the file cannot be read', async ($, on) => {
  const toasts = project(on)

  const answer = await edit($, "/work/src/a.ts", "[readFile(p), stat(p)]", "readFile(p)")
  expect(answer.context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = project(on)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await write($, FLAGGED[0]?.[0] ?? '', FLAGGED[0]?.[1] ?? '')
  expect(toasts[0]).toBe("unused-import-note: import sem uso writeFile em src/a.ts, o Claude foi avisado")
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const toasts = project(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await write($, FLAGGED[0]?.[0] ?? '', FLAGGED[0]?.[1] ?? '')
  expect(toasts[0]).toBe('unused-import-note: import sin uso writeFile en src/a.ts, se avisó a Claude')
})

test('a property of the same name is not a use', async ($, on) => {
  project(on)
  const code = "import { size } from './s'\nexport const n = list.size\n"

  expect((await write($, '/work/src/a.ts', code)).context?.[0]).toContain('never uses: size.')
})

test('a name that appears only in a comment or a string is unused', async ($, on) => {
  project(on)
  const code = "import { pick } from './p'\n// pick(a)\nexport const s = 'pick'\n"

  expect((await write($, '/work/src/a.mjs', code)).context?.[0]).toContain('never uses: pick.')
})

test('lists every unused name of the edit in one note', async ($, on) => {
  const toasts = project(on)
  const code = "import def, { one, two as three } from './x'\nimport type { Kind } from './k'\nexport const z = 1\n"

  const answer = await write($, '/work/src/a.ts', code)
  expect(answer.context?.[0]).toContain('never uses: one, three, def, Kind.')
  expect(toasts).toHaveLength(1)
})

test('removing the last use in an Edit is flagged', async ($, on) => {
  project(on, { '/work/src/a.ts': "import { fmt } from './f'\nexport const s = fmt(1)\n" })

  const answer = await edit($, '/work/src/a.ts', 'fmt(1)', 'String(1)')
  expect(answer.context?.[0]).toContain('never uses: fmt.')
})
