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
    "function f() {\n  // const total = sum(items);\n  // render(total);\n  // }\n  return 1\n}\n",
    "3+ commented-out lines at \"const total = sum(items);\""
  ],
  [
    "/work/src/a.py",
    "def f():\n    # x = compute(1)\n    # print(x)\n    # y = 2\n    return 1\n",
    "3+ commented-out lines at \"x = compute(1)\""
  ]
]

const FINE: readonly [string, string][] = [
  [
    "/work/src/a.ts",
    "// const total = sum(items);\n// render(total);\nconst a = 1\n"
  ],
  [
    "/work/src/a.ts",
    "// Retries the call when the server answers 503 and the token is stale,\n// because the refresh endpoint is slow after a deploy\n// and the first answer is often an error.\nconst a = 1\n"
  ],
  [
    "/work/src/a.ts",
    "// const total = sum(items);\n// render(total);\nconst a = 1\n// toast(total);\n"
  ],
  [
    "/work/src/a.ts",
    "/// <summary>a = 1;</summary>\n/// b = 2;\n/// c = 3;\n"
  ],
  [
    "/work/src/a.ts",
    "// eslint-disable-next-line no-console\n// @ts-expect-error legacy\n// prettier-ignore\n"
  ],
  [
    "/work/notes.md",
    "// const a = 1;\n// run(a);\n// b = 2;\n"
  ]
]

test('tells Claude what the edit added and shows a toast', async ($, on) => {
  const toasts = project(on)

  for (const [file, content, detail] of FLAGGED) {
    const answer = await write($, file, content)
    expect(answer.context?.[0], detail).toContain(detail)
    expect(answer.context?.[0], detail).toContain('commented-code-note: ')
  }

  expect(toasts).toHaveLength(FLAGGED.length)
  expect(toasts[0]).toBe("commented-code-note: commented-out code in src/a.ts, Claude was told")
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
    "/work/src/a.ts": "const a = 1\n// const total = sum(items);\n// render(total);\n",
    "/work/src/b.ts": "// const total = sum(items);\n// render(total);\n// done();\nconst n = 1\n",
  })

  const added = await edit($, "/work/src/a.ts", "// render(total);", "// render(total);\n// done();")
  expect(added.context?.[0]).toContain("3+ commented-out lines at \"const total = sum(items);\"")
  expect(toasts).toHaveLength(1)

  const kept = await edit($, "/work/src/b.ts", "const n = 1", "const n = 2")
  expect(kept.context).toBeUndefined()
  expect(toasts).toHaveLength(1)
})

test('leaves an Edit alone when the file cannot be read', async ($, on) => {
  const toasts = project(on)

  const answer = await edit($, "/work/src/a.ts", "// render(total);", "// render(total);\n// done();")
  expect(answer.context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = project(on)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await write($, FLAGGED[0]?.[0] ?? '', FLAGGED[0]?.[1] ?? '')
  expect(toasts[0]).toBe("commented-code-note: código comentado em src/a.ts, o Claude foi avisado")
})

const BLOCK = '// const total = sum(items);\n// render(total);\n// done();\n'

test('adds nothing when the write is denied or fails', async ($, on) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', () => ({ deny: 'ENOENT' }))
  on('tool.call', { tool: 'Write' }, (_$, e) => (e.content.includes('deny') ? { deny: 'no' } : { result: undefined as never, isError: true }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  expect((await write($, '/work/src/a.ts', `${BLOCK}// deny\n`)).deny).toBe('no')
  expect((await write($, '/work/src/a.ts', BLOCK)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('applies replace_all before judging an Edit', async ($, on) => {
  const toasts = project(on, { '/work/src/c.ts': 'X\nX\nX\nconst a = 1\n' })

  const answer = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/c.ts',
    old_string: 'X',
    new_string: '// run(a);',
    replace_all: true,
    tool_use_id: 'ra',
  })
  expect(answer.context?.[0]).toContain('3+ commented-out lines at "run(a);"')
  expect(toasts).toHaveLength(1)
})

test('shows a Windows path relative to the root and a foreign path whole', async ($, on) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: String.raw`C:\Work` }))
  on('fs.read', () => ({ deny: 'ENOENT' }))
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await write($, String.raw`c:\work\src\w.go`, BLOCK)
  await write($, '/elsewhere/x.rs', BLOCK)
  expect(toasts).toEqual([
    'commented-code-note: commented-out code in src/w.go, Claude was told',
    'commented-code-note: commented-out code in /elsewhere/x.rs, Claude was told',
  ])
})

test('keeps the context a hook beneath already added', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', () => ({ deny: 'ENOENT' }))
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never, context: ['from below'] }))
  on('ui.toast', () => ({ value: undefined }))

  const answer = await write($, '/work/src/k.kt', BLOCK)
  expect(answer.context?.[0]).toBe('from below')
  expect(answer.context?.[1]).toContain('commented-code-note: src/k.kt now holds commented-out code')
})

test('skips declaration files and minified bundles', async ($, on) => {
  const toasts = project(on)

  for (const skipped of ['/work/src/types.d.ts', '/work/src/app.min.js', '/work/src/__mocks__/a.ts', '/work/src/a.spec.tsx']) {
    expect((await write($, skipped, BLOCK)).context, skipped).toBeUndefined()
  }

  expect(toasts).toEqual([])
})

test('speaks Spanish when the hub says so', async ($, on) => {
  const toasts = project(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await write($, '/work/src/a.ts', BLOCK)
  expect(toasts[0]).toBe('commented-code-note: código comentado en src/a.ts, se avisó a Claude')
  expect(answer.context?.[0]).toContain('Dead code left in a comment goes stale')
})
