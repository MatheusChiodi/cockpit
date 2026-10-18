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
    "if (!ok) throw new Error('failed')\n",
    "Error(\"failed\")"
  ],
  [
    "/work/src/a.ts",
    "throw new Error(\"Something went wrong.\")\n",
    "Error(\"Something went wrong.\")"
  ],
  [
    "/work/src/a.ts",
    "throw new Error()\n",
    "Error()"
  ],
  [
    "/work/src/a.py",
    "def f():\n    raise ValueError(\"invalid\")\n",
    "ValueError(\"invalid\")"
  ]
]

const FINE: readonly [string, string][] = [
  [
    "/work/src/a.ts",
    "throw new Error('failed to read ' + path)\nthrow new Error('Failed to parse config.json: ' + e.message)\n"
  ],
  [
    "/work/src/a.ts",
    "throw new Error(message)\nthrow new TypeError(\"expected a string, got \" + typeof x)\nthrow new HttpError()\n"
  ],
  [
    "/work/src/a.py",
    "raise ValueError(f\"bad value {x}\")\nraise KeyError(\"user id missing\")\n"
  ],
  [
    "/work/src/a.ts",
    "// throw new Error('failed')\nconst s = \"new Error('failed')\"\n"
  ],
  [
    "/work/notes.md",
    "throw new Error('failed')\n"
  ]
]

test('tells Claude what the edit added and shows a toast', async ($, on) => {
  const toasts = project(on)

  for (const [file, content, detail] of FLAGGED) {
    const answer = await write($, file, content)
    expect(answer.context?.[0], detail).toContain(detail)
    expect(answer.context?.[0], detail).toContain('error-context-note: ')
  }

  expect(toasts).toHaveLength(FLAGGED.length)
  expect(toasts[0]).toBe("error-context-note: error without context (Error(\"failed\")) in src/a.ts, Claude was told")
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
    "/work/src/a.ts": "const a = 1\nthrow new Error('failed to load ' + a)\n",
    "/work/src/b.ts": "throw new Error('failed')\nconst n = 1\n",
  })

  const added = await edit($, "/work/src/a.ts", "const a = 1", "const a = 1\nif (!a) throw new Error('error')")
  expect(added.context?.[0]).toContain("Error(\"error\")")
  expect(toasts).toHaveLength(1)

  const kept = await edit($, "/work/src/b.ts", "const n = 1", "const n = 2")
  expect(kept.context).toBeUndefined()
  expect(toasts).toHaveLength(1)
})

test('leaves an Edit alone when the file cannot be read', async ($, on) => {
  const toasts = project(on)

  const answer = await edit($, "/work/src/a.ts", "const a = 1", "const a = 1\nif (!a) throw new Error('error')")
  expect(answer.context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = project(on)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await write($, FLAGGED[0]?.[0] ?? '', FLAGGED[0]?.[1] ?? '')
  expect(toasts[0]).toBe("error-context-note: erro sem contexto (Error(\"failed\")) em src/a.ts, o Claude foi avisado")
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const toasts = project(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await write($, FLAGGED[0]?.[0] ?? '', FLAGGED[0]?.[1] ?? '')
  expect(toasts[0]).toBe('error-context-note: error sin contexto (Error("failed")) en src/a.ts, se avisó a Claude')
})

test('flags vague Java exceptions and leaves descriptive ones alone', async ($, on) => {
  const toasts = project(on)

  const vague = await write($, '/work/src/App.java', 'class A { void f() { throw new RuntimeException("Unexpected error!"); } }\n')
  expect(vague.context?.[0]).toContain('RuntimeException("Unexpected error!")')

  const clear = await write($, '/work/src/App.java', 'class A { void f() { throw new IllegalStateException("order " + id + " already shipped"); } }\n')
  expect(clear.context).toBeUndefined()
  expect(toasts).toHaveLength(1)
})

test('matches vague messages regardless of case and trailing punctuation', async ($, on) => {
  project(on)

  const answer = await write($, '/work/src/a.js', "throw new Error('ERROR...')\nthrow new TypeError('Invalid input!')\n")
  expect(answer.context?.[0]).toContain('Error("ERROR..."), TypeError("Invalid input!")')
})

test('ignores a raise inside a Python comment or docstring', async ($, on) => {
  project(on)
  const code = '"""\nraise ValueError("invalid")\n"""\n# raise Exception("error")\nvalue = 1\n'

  expect((await write($, '/work/src/a.py', code)).context).toBeUndefined()
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
