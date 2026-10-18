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
    "const a = 1\n// TODO: handle retries\n",
    "// TODO: handle retries"
  ],
  [
    "/work/src/a.py",
    "a = 1\n# FIXME broken on windows\n",
    "# FIXME broken on windows"
  ],
  [
    "/work/src/a.ts",
    "/* HACK until the API is fixed */\nconst a = 1\n",
    "/* HACK until the API is fixed */"
  ]
]

const FINE: readonly [string, string][] = [
  [
    "/work/src/a.ts",
    "// TODO(matheus): handle retries\n"
  ],
  [
    "/work/src/a.ts",
    "// TODO [PROJ-123] handle retries\n// FIXME PROJ-9 later\n"
  ],
  [
    "/work/src/a.ts",
    "// TODO #482 handle retries\n// HACK see https://example.com/issue\n"
  ],
  [
    "/work/src/a.ts",
    "// TODO @matheus handle retries\n"
  ],
  [
    "/work/src/a.ts",
    "const TODO_LIST = []\nconst todo = 1\n// todo lowercase prose\n"
  ],
  [
    "/work/notes.md",
    "// TODO: handle retries\n"
  ]
]

test('tells Claude what the edit added and shows a toast', async ($, on) => {
  const toasts = project(on)

  for (const [file, content, detail] of FLAGGED) {
    const answer = await write($, file, content)
    expect(answer.context?.[0], detail).toContain(detail)
    expect(answer.context?.[0], detail).toContain('todo-owner-note: ')
  }

  expect(toasts).toHaveLength(FLAGGED.length)
  expect(toasts[0]).toBe("todo-owner-note: TODO without an owner in src/a.ts, Claude was told")
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
    "/work/src/a.ts": "const a = 1\n",
    "/work/src/b.ts": "const a = 1\n// TODO: handle retries\n",
  })

  const added = await edit($, "/work/src/a.ts", "const a = 1", "const a = 1\n// FIXME: clean this")
  expect(added.context?.[0]).toContain("// FIXME: clean this")
  expect(toasts).toHaveLength(1)

  const kept = await edit($, "/work/src/b.ts", "const a = 1", "const a = 2")
  expect(kept.context).toBeUndefined()
  expect(toasts).toHaveLength(1)
})

test('leaves an Edit alone when the file cannot be read', async ($, on) => {
  const toasts = project(on)

  const answer = await edit($, "/work/src/a.ts", "const a = 1", "const a = 1\n// FIXME: clean this")
  expect(answer.context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = project(on)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await write($, FLAGGED[0]?.[0] ?? '', FLAGGED[0]?.[1] ?? '')
  expect(toasts[0]).toBe("todo-owner-note: TODO sem responsável em src/a.ts, o Claude foi avisado")
})

test('a Write over a file judges only the markers it adds', async ($, on) => {
  const toasts = project(on, { '/work/src/c.ts': '// TODO: old one\n' })

  const same = await write($, '/work/src/c.ts', '// TODO: old one\nconst c = 1\n')
  expect(same.context).toBeUndefined()

  const more = await write($, '/work/src/c.ts', '// TODO: old one\n// TODO: old one\n')
  expect(more.context?.[0]).toContain('// TODO: old one')
  expect(toasts).toHaveLength(1)
})

test('an Edit with replace_all counts every copy it makes', async ($, on) => {
  project(on, { '/work/src/d.ts': 'x()\ny()\nx()\n' })

  const answer = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/d.ts',
    old_string: 'x()',
    new_string: 'x() // HACK skip',
    replace_all: true,
    tool_use_id: `e${(counter += 1)}`,
  })
  expect(answer.context?.[0]).toContain('src/d.ts now has a marker nobody owns: x() // HACK skip.')
})

test('says nothing when the write was refused, or for files that are not source', async ($, on) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', () => ({ deny: 'ENOENT' }))
  on('tool.call', { tool: 'Write' }, (_: unknown, e: { file_path: string }) =>
    e.file_path.endsWith('.ts') ? { deny: 'blocked' } : { result: undefined as never },
  )
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  expect((await write($, '/work/src/a.ts', '// TODO: x\n')).deny).toBe('blocked')
  expect((await write($, '/work/config.json', '// TODO: x\n')).context).toBeUndefined()
  expect((await write($, '/work/types/a.d.ts', '// TODO: x\n')).deny).toBe('blocked')
  expect(toasts).toEqual([])
})

test('shows a path outside the project as it is', async ($, on) => {
  const toasts = project(on)

  await write($, '/elsewhere/a.go', '// TODO: later\n')
  expect(toasts[0]).toBe('todo-owner-note: TODO without an owner in /elsewhere/a.go, Claude was told')
})

test('speaks Spanish when the hub says so', async ($, on) => {
  const toasts = project(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await write($, '/work/src/a.rb', '# TODO fix\n')
  expect(toasts[0]).toBe('todo-owner-note: TODO sin responsable en src/a.rb, se avisó a Claude')
  // What the model reads stays in English.
  expect(answer.context?.[0]).toContain('now has a marker nobody owns')
})
