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
    "/work/app/a.py",
    "def add(item, seen=[]):\n    seen.append(item)\n",
    "add(seen=…)"
  ],
  [
    "/work/app/a.py",
    "def f(a, *, cache: dict = {}):\n    pass\n",
    "f(cache=…)"
  ],
  [
    "/work/app/a.py",
    "def g(x=set(), y=1):\n    pass\n",
    "g(x=…)"
  ]
]

const FINE: readonly [string, string][] = [
  [
    "/work/app/a.py",
    "def add(item, seen=None):\n    seen = seen or []\n"
  ],
  [
    "/work/app/a.py",
    "def f(a=(), b=1, c=\"[]\", d=0):\n    pass\n"
  ],
  [
    "/work/app/a.py",
    "x = []\ny = {}\ndef f(a):\n    z = [a]\n"
  ],
  [
    "/work/app/a.py",
    "class A:\n    items: list = field(default_factory=list)\n"
  ],
  [
    "/work/app/a.py",
    "# def add(item, seen=[]):\nvalue = 1\n"
  ],
  [
    "/work/app/a.js",
    "function f(a = []) {}\n"
  ],
  [
    "/work/notes.md",
    "def add(item, seen=[]):\n"
  ]
]

test('tells Claude what the edit added and shows a toast', async ($, on) => {
  const toasts = project(on)

  for (const [file, content, detail] of FLAGGED) {
    const answer = await write($, file, content)
    expect(answer.context?.[0], detail).toContain(detail)
    expect(answer.context?.[0], detail).toContain('mutable-default-note: ')
  }

  expect(toasts).toHaveLength(FLAGGED.length)
  expect(toasts[0]).toBe("mutable-default-note: mutable default (add(seen=…)) in app/a.py, Claude was told")
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
    "/work/app/a.py": "def add(item, seen=None):\n    pass\n",
    "/work/app/b.py": "def add(item, seen=[]):\n    n = 1\n",
  })

  const added = await edit($, "/work/app/a.py", "def add(item, seen=None):", "def add(item, seen=[]):")
  expect(added.context?.[0]).toContain("add(seen=…)")
  expect(toasts).toHaveLength(1)

  const kept = await edit($, "/work/app/b.py", "n = 1", "n = 2")
  expect(kept.context).toBeUndefined()
  expect(toasts).toHaveLength(1)
})

test('leaves an Edit alone when the file cannot be read', async ($, on) => {
  const toasts = project(on)

  const answer = await edit($, "/work/app/a.py", "def add(item, seen=None):", "def add(item, seen=[]):")
  expect(answer.context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = project(on)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await write($, FLAGGED[0]?.[0] ?? '', FLAGGED[0]?.[1] ?? '')
  expect(toasts[0]).toBe("mutable-default-note: padrão mutável (add(seen=…)) em app/a.py, o Claude foi avisado")
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const toasts = project(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await write($, FLAGGED[0]?.[0] ?? '', FLAGGED[0]?.[1] ?? '')
  expect(toasts[0]).toBe('mutable-default-note: valor mutable por defecto (add(seen=…)) en app/a.py, se avisó a Claude')
})

test('lists every mutable default of a signature, across lines and with collections', async ($, on) => {
  const toasts = project(on)
  const code = 'def build(\n    a,\n    opts={"k": [1, 2]},\n    q=collections.deque(),\n    b=list(),\n):\n    pass\n'

  const answer = await write($, '/work/app/a.py', code)
  expect(answer.context?.[0]).toContain('build(opts=…), build(q=…), build(b=…)')
  expect(toasts).toHaveLength(1)
})

test('ignores a mutable default inside a docstring', async ($, on) => {
  project(on)

  expect((await write($, '/work/app/a.py', '"""\ndef add(item, seen=[]):\n"""\nvalue = 1\n')).context).toBeUndefined()
})

test('skips generated protobuf modules', async ($, on) => {
  const toasts = project(on)

  expect((await write($, '/work/app/user_pb2.py', FLAGGED[0]?.[1] ?? '')).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('passes a denied Edit through without a note', async ($, on) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', () => ({ value: 'def add(item, seen=None):\n    pass\n' }))
  on('tool.call', { tool: 'Edit' }, () => ({ deny: 'no edits' }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  const answer = await edit($, '/work/app/a.py', 'seen=None', 'seen=[]')
  expect(answer.deny).toBe('no edits')
  expect(toasts).toEqual([])
})
