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
    "export function send(to: string, subject: string, body: string, cc: string[], bcc: string[], retries: number) {}\n",
    "send(6 parameters)"
  ],
  [
    "/work/src/a.ts",
    "const build = async (a, b, c, d, e, f, g) => 1\n",
    "build(7 parameters)"
  ],
  [
    "/work/src/a.py",
    "def run(self, a, b, c, d, e, f):\n    pass\n",
    "run(6 parameters)"
  ]
]

const FINE: readonly [string, string][] = [
  [
    "/work/src/a.ts",
    "function send(to: string, subject: string, body: string, cc: string[], bcc: string[]) {}\n"
  ],
  [
    "/work/src/a.ts",
    "function send({ to, subject, body, cc, bcc, retries, from }: Options) {}\n"
  ],
  [
    "/work/src/a.ts",
    "function f(a: Map<string, number>, b = [1, 2, 3, 4, 5, 6, 7], c = call(1, 2, 3, 4, 5, 6)) {}\n"
  ],
  [
    "/work/src/a.py",
    "def run(self, a, b, c, d, e):\n    pass\n"
  ],
  [
    "/work/src/a.ts",
    "const x = call(a, b, c, d, e, f, g)\n"
  ],
  [
    "/work/notes.md",
    "function send(a, b, c, d, e, f) {}\n"
  ]
]

test('tells Claude what the edit added and shows a toast', async ($, on) => {
  const toasts = project(on)

  for (const [file, content, detail] of FLAGGED) {
    const answer = await write($, file, content)
    expect(answer.context?.[0], detail).toContain(detail)
    expect(answer.context?.[0], detail).toContain('param-count-note: ')
  }

  expect(toasts).toHaveLength(FLAGGED.length)
  expect(toasts[0]).toBe("param-count-note: send(6 parameters) in src/a.ts, Claude was told")
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
    "/work/src/a.ts": "function send(a, b, c, d, e) {}\n",
    "/work/src/b.ts": "function send(a, b, c, d, e, f) {}\nconst n = 1\n",
  })

  const added = await edit($, "/work/src/a.ts", "function send(a, b, c, d, e) {}", "function send(a, b, c, d, e) {}\nfunction mail(a, b, c, d, e, f) {}")
  expect(added.context?.[0]).toContain("mail(6 parameters)")
  expect(toasts).toHaveLength(1)

  const kept = await edit($, "/work/src/b.ts", "const n = 1", "const n = 2")
  expect(kept.context).toBeUndefined()
  expect(toasts).toHaveLength(1)
})

test('leaves an Edit alone when the file cannot be read', async ($, on) => {
  const toasts = project(on)

  const answer = await edit($, "/work/src/a.ts", "function send(a, b, c, d, e) {}", "function send(a, b, c, d, e) {}\nfunction mail(a, b, c, d, e, f) {}")
  expect(answer.context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = project(on)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await write($, FLAGGED[0]?.[0] ?? '', FLAGGED[0]?.[1] ?? '')
  expect(toasts[0]).toBe("param-count-note: send(6 parameters) em src/a.ts, o Claude foi avisado")
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const toasts = project(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await write($, FLAGGED[0]?.[0] ?? '', FLAGGED[0]?.[1] ?? '')
  expect(toasts[0]).toBe('param-count-note: send(6 parameters) en src/a.ts, se avisó a Claude')
})

test('does not count this, cls or the Python separators as parameters', async ($, on) => {
  const toasts = project(on)

  expect((await write($, '/work/src/a.ts', 'function f(this: Window, a, b, c, d, e) {}\n')).context).toBeUndefined()
  expect((await write($, '/work/src/a.py', 'def f(cls, a, b, *, c, d, e):\n    pass\n')).context).toBeUndefined()
  expect((await write($, '/work/src/a.py', 'def f(a, b, /, c, d, e):\n    pass\n')).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('ignores signatures inside comments and strings', async ($, on) => {
  project(on)

  expect((await write($, '/work/src/a.ts', '// function send(a, b, c, d, e, f) {}\nconst s = "function g(a, b, c, d, e, f) {}"\n')).context).toBeUndefined()
  expect((await write($, '/work/src/a.py', '"""def run(a, b, c, d, e, f):"""\n# def go(a, b, c, d, e, f):\n')).context).toBeUndefined()
})

test('lists every new long function, once each', async ($, on) => {
  const toasts = project(on)

  const answer = await write($, '/work/src/a.ts', 'function a(p, q, r, s, t, u) {}\nconst b = (p, q, r, s, t, u, v) => 1\n')
  expect(answer.context?.[0]).toContain('a(6 parameters), b(7 parameters)')
  expect(toasts).toHaveLength(1)
})

test('applies replace_all when judging an Edit', async ($, on) => {
  project(on, { '/work/src/c.ts': 'function x(a) {}\nfunction y(a) {}\n' })

  const answer = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/c.ts',
    old_string: '(a)',
    new_string: '(a, b, c, d, e, f)',
    replace_all: true,
    tool_use_id: 'e-all',
  })
  expect(answer.context?.[0]).toContain('x(6 parameters), y(6 parameters)')
})

test('adds nothing when the tool beneath refuses the write', async ($, on) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', () => ({ deny: 'ENOENT' }))
  on('tool.call', { tool: 'Write' }, () => ({ deny: 'refused beneath' }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  const answer = await write($, FLAGGED[0]?.[0] ?? '', FLAGGED[0]?.[1] ?? '')
  expect(answer.deny).toBe('refused beneath')
  expect(toasts).toEqual([])
})
