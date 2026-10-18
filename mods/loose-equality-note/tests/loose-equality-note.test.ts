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
    "if (a == b) {\n  run()\n}\n",
    "if (a == b) {"
  ],
  [
    "/work/src/a.js",
    "const same = x != 0\n",
    "const same = x != 0"
  ]
]

const FINE: readonly [string, string][] = [
  [
    "/work/src/a.ts",
    "if (a === b) run()\nif (a !== b) run()\n"
  ],
  [
    "/work/src/a.ts",
    "if (a == null) run()\nif (b != undefined) run()\nif (null == c) run()\n"
  ],
  [
    "/work/src/a.ts",
    "const s = 'a == b'\nconst t = `x != y`\n// a == b\n"
  ],
  [
    "/work/src/a.ts",
    "const ok = a <= b && c >= d\nconst f = (x) => x\nlet y = 1\ny += 2\n"
  ],
  [
    "/work/notes.md",
    "if (a == b) run()\n"
  ]
]

test('tells Claude what the edit added and shows a toast', async ($, on) => {
  const toasts = project(on)

  for (const [file, content, detail] of FLAGGED) {
    const answer = await write($, file, content)
    expect(answer.context?.[0], detail).toContain(detail)
    expect(answer.context?.[0], detail).toContain('loose-equality-note: ')
  }

  expect(toasts).toHaveLength(FLAGGED.length)
  expect(toasts[0]).toBe("loose-equality-note: loose comparison (if (a == b) {) in src/a.ts, Claude was told")
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
    "/work/src/a.ts": "if (a === b) run()\n",
    "/work/src/b.ts": "if (a == b) run()\nconst n = 1\n",
  })

  const added = await edit($, "/work/src/a.ts", "if (a === b) run()", "if (a === b) run()\nif (c == d) stop()")
  expect(added.context?.[0]).toContain("if (c == d) stop()")
  expect(toasts).toHaveLength(1)

  const kept = await edit($, "/work/src/b.ts", "const n = 1", "const n = 2")
  expect(kept.context).toBeUndefined()
  expect(toasts).toHaveLength(1)
})

test('leaves an Edit alone when the file cannot be read', async ($, on) => {
  const toasts = project(on)

  const answer = await edit($, "/work/src/a.ts", "if (a === b) run()", "if (a === b) run()\nif (c == d) stop()")
  expect(answer.context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = project(on)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await write($, FLAGGED[0]?.[0] ?? '', FLAGGED[0]?.[1] ?? '')
  expect(toasts[0]).toBe("loose-equality-note: comparação frouxa (if (a == b) {) em src/a.ts, o Claude foi avisado")
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const toasts = project(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await write($, FLAGGED[1]?.[0] ?? '', FLAGGED[1]?.[1] ?? '')
  expect(toasts[0]).toBe('loose-equality-note: comparación laxa (const same = x != 0) en src/a.js, se avisó a Claude')
})

test('shortens a long line to 50 characters in the toast', async ($, on) => {
  const toasts = project(on)
  const line = `if (${'someVeryLongIdentifier'.repeat(3)} == expected) {`

  await write($, '/work/src/a.ts', `${line}\n}\n`)
  expect(toasts[0]).toBe(`loose-equality-note: loose comparison (${line.slice(0, 50)}) in src/a.ts, Claude was told`)
})

test('flags the loose half of a line that also checks null', async ($, on) => {
  project(on)

  const answer = await write($, '/work/src/a.tsx', 'const ok = a == null && b == c\n')
  expect(answer.context?.[0]).toContain('const ok = a == null && b == c')
})

test('void 0 counts as a nullish check', async ($, on) => {
  project(on)

  expect((await write($, '/work/src/a.cjs', 'if (x != void 0) run()\n')).context).toBeUndefined()
})

test('passes a denied Write through without a toast', async ($, on) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', () => ({ deny: 'ENOENT' }))
  on('tool.call', { tool: 'Write' }, () => ({ deny: 'blocked' }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  expect((await write($, FLAGGED[0]?.[0] ?? '', FLAGGED[0]?.[1] ?? '')).deny).toBe('blocked')
  expect(toasts).toEqual([])
})
