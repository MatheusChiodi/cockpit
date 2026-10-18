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
    "const a = () => wait(3000)\nconst b = () => retry(3000)\nconst c = delay > 3000\n",
    "3000 (3x)"
  ],
  [
    "/work/src/a.py",
    "a = wait(4500)\nb = retry(4500)\nc = delay > 4500\n",
    "4500 (3x)"
  ]
]

const FINE: readonly [string, string][] = [
  [
    "/work/src/a.ts",
    "const a = wait(3000)\nconst b = retry(3000)\n"
  ],
  [
    "/work/src/a.ts",
    "const TIMEOUT_MS = 3000\nconst a = wait(TIMEOUT_MS)\nconst b = retry(TIMEOUT_MS)\nconst c = delay > TIMEOUT_MS\n"
  ],
  [
    "/work/src/a.ts",
    "if (r.status === 404) a()\nif (s === 404) b()\nif (t === 404) c()\nconst n = 100 + 100 + 100\n"
  ],
  [
    "/work/src/a.ts",
    "const P = [150, 150, 150, 150]\nconst Q = [150, 150, 150, 150]\nconst R = [150, 150, 150, 150]\n"
  ],
  [
    "/work/src/a.ts",
    "const a = 'wait 3000'\nconst b = '3000 ms'\n// 3000 3000 3000\n"
  ],
  [
    "/work/notes.md",
    "wait(3000)\nwait(3000)\nwait(3000)\n"
  ]
]

test('tells Claude what the edit added and shows a toast', async ($, on) => {
  const toasts = project(on)

  for (const [file, content, detail] of FLAGGED) {
    const answer = await write($, file, content)
    expect(answer.context?.[0], detail).toContain(detail)
    expect(answer.context?.[0], detail).toContain('magic-number-note: ')
  }

  expect(toasts).toHaveLength(FLAGGED.length)
  expect(toasts[0]).toBe("magic-number-note: bare number repeated (3000 (3x)) in src/a.ts, Claude was told")
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
    "/work/src/a.ts": "const a = wait(3000)\nconst b = retry(3000)\n",
    "/work/src/b.ts": "const a = () => wait(3000)\nconst b = () => retry(3000)\nconst c = delay > 3000\nconst d = 1\n",
  })

  const added = await edit($, "/work/src/a.ts", "const b = retry(3000)", "const b = retry(3000)\nconst c = delay > 3000")
  expect(added.context?.[0]).toContain("3000")
  expect(toasts).toHaveLength(1)

  const kept = await edit($, "/work/src/b.ts", "const d = 1", "const d = 2")
  expect(kept.context).toBeUndefined()
  expect(toasts).toHaveLength(1)
})

test('leaves an Edit alone when the file cannot be read', async ($, on) => {
  const toasts = project(on)

  const answer = await edit($, "/work/src/a.ts", "const b = retry(3000)", "const b = retry(3000)\nconst c = delay > 3000")
  expect(answer.context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = project(on)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await write($, FLAGGED[0]?.[0] ?? '', FLAGGED[0]?.[1] ?? '')
  expect(toasts[0]).toBe("magic-number-note: número solto repetido (3000 (3x)) em src/a.ts, o Claude foi avisado")
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const toasts = project(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await write($, FLAGGED[0]?.[0] ?? '', FLAGGED[0]?.[1] ?? '')
  expect(toasts[0]).toBe('magic-number-note: número suelto repetido (3000 (3x)) en src/a.ts, se avisó a Claude')
})

test('counts decimals with two places and lists every repeated number', async ($, on) => {
  project(on)

  const content = 'a(0.75, 7777)\nb(0.75, 7777)\nc(0.75, 7777)\n'
  const answer = await write($, '/work/src/rate.go', content)
  expect(answer.context?.[0]).toContain('0.75 (3x), 7777 (3x)')
})

test('ignores numbers inside identifiers, Python comments and docstrings', async ($, on) => {
  const toasts = project(on)

  expect((await write($, '/work/src/a.ts', 'v3000()\nv3000()\nv3000()\nx.3000\n')).context).toBeUndefined()
  expect((await write($, '/work/src/a.py', '"""\n3000 3000\n3000\n"""\n# 3000\n# 3000\n')).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('skips declaration files', async ($, on) => {
  project(on)

  expect((await write($, '/work/src/types.d.ts', FLAGGED[0]?.[1] ?? '')).context).toBeUndefined()
})

test('leaves a denied write alone', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', () => ({ deny: 'ENOENT' }))
  on('tool.call', { tool: 'Write' }, () => ({ deny: 'nope' }))

  const answer = await write($, FLAGGED[0]?.[0] ?? '', FLAGGED[0]?.[1] ?? '')
  expect(answer.deny).toBe('nope')
  expect(answer.context).toBeUndefined()
})
