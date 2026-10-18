import { expect, test } from 'claude-code/testing'

const slashed = (path: string) => path.replaceAll('\\', '/')

let counter = 0

// A project at /work with `deps` and project `files` by path; returns the toasts the person saw.
const project = (on: any, deps: string[], files: Record<string, string> = {}) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) => {
    const path = slashed(e.path)

    if (path.endsWith('/work/package.json')) {
      return { value: JSON.stringify({ dependencies: Object.fromEntries(deps.map(name => [name, '1'])) }) }
    }

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

const write = ($: any, file_path: string, content: string) => {
  counter += 1

  return $.tool.call({ tool: 'Write', file_path, content, tool_use_id: `w-${counter}` })
}

const CONDITIONAL = `function Cart({ open }) {
  if (open) {
    const [size] = useState(0)
  }
  return null
}`

const EARLY = `function Cart({ ok }) {
  if (!ok) return null
  const [size] = useState(0)
  return <p>{size}</p>
}`

const LOOP = `function Cart({ items }) {
  return items.map(item => {
    const label = useMemo(() => item.name, [item])
    return <p>{label}</p>
  })
}`

const TERNARY = `function Cart({ ok }) {
  const value = ok ? useTheme() : null
  return <p>{value}</p>
}`

const INLINE = `function Cart({ ok }) {
  if (ok) useEffect(() => {}, [])
  return null
}`

test('notes a hook inside a condition, a loop callback, after an early return or in a ternary', async ($, on) => {
  const toasts = project(on, ['react'])

  for (const [code, detail] of [
    [CONDITIONAL, 'useState inside a condition'],
    [EARLY, 'useState after an early return'],
    [LOOP, 'useMemo in a loop callback'],
    [TERNARY, 'useTheme inside a condition'],
    [INLINE, 'useEffect inside a condition'],
  ] as const) {
    const ran = await write($, '/work/src/Cart.tsx', code)
    expect(ran.context?.[0], detail).toContain(`hook-order-note: src/Cart.tsx now calls ${detail}`)
    expect(ran.context?.[0]).toContain('every hook must run on every render in the same order')
  }

  expect(toasts[0]).toBe('hook-order-note: useState inside a condition in src/Cart.tsx, Claude was told to move it')
})

test('stays silent for hooks at the top level, custom hook definitions and returns after the hooks', async ($, on) => {
  const toasts = project(on, ['react'])

  const correct = `export function useCounter(start) {
  return useState(start)
}

function Cart({ ok, items }) {
  const [size, setSize] = useState(0)
  const label = useMemo(() => items.map(item => item.name), [items])
  useEffect(() => {
    if (!ok) {
      return
    }
    setSize(items.length)
  }, [ok, items])
  const { data } = useQuery({
    enabled: ok,
  })
  if (!ok) return null
  if (items.length === 0) {
    return <p>empty</p>
  }
  return <p>{size}{label}{data}</p>
}`

  const ran = await write($, '/work/src/Cart.tsx', correct)
  expect(ran.context).toBeUndefined()
  expect(toasts).toEqual([])

  const text = await write($, '/work/src/Cart.tsx', `// call useThing() only at the top\nconst note = "if (a) useX()"`)
  expect(text.context).toBeUndefined()
})

test('judges only what an Edit adds', async ($, on) => {
  project(on, ['react'], { '/work/src/Cart.tsx': CONDITIONAL })

  const kept = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/Cart.tsx',
    old_string: 'return null',
    new_string: 'return <p />',
    tool_use_id: 'e1',
  })
  expect(kept.context).toBeUndefined()

  const added = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/Cart.tsx',
    old_string: 'return null',
    new_string: 'if (open) useEffect(() => {}, [])\n  return null',
    tool_use_id: 'e2',
  })
  expect(added.context?.[0]).toContain('now calls useEffect inside a condition')
})

test('does nothing without React', async ($, on) => {
  const toasts = project(on, ['express'])

  expect((await write($, '/work/src/Cart.tsx', CONDITIONAL)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('does nothing outside .tsx and .jsx files', async ($, on) => {
  project(on, ['react'])

  expect((await write($, '/work/src/cart.ts', CONDITIONAL)).context).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = project(on, ['react'])
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await write($, '/work/src/Cart.tsx', CONDITIONAL)
  expect(toasts[0]).toBe('hook-order-note: useState inside a condition em src/Cart.tsx, o Claude foi avisado para movê-lo')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const toasts = project(on, ['react'])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await write($, '/work/src/Cart.tsx', CONDITIONAL)
  expect(toasts[0]).toBe('hook-order-note: useState inside a condition en src/Cart.tsx, se avisó a Claude para moverlo')
})

test('notes a hook inside a for loop and works in .jsx files', async ($, on) => {
  project(on, ['react'])

  const loop = `function List({ items }) {
  for (const item of items) {
    const [x] = useState(item)
  }
  return null
}`

  const ran = await write($, '/work/src/List.jsx', loop)
  expect(ran.context?.[0]).toContain('src/List.jsx now calls useState in a loop')
})

test('adds nothing when the tool beneath refuses the write', async ($, on) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_, e) =>
    slashed(e.path).endsWith('/work/package.json') ? { value: JSON.stringify({ dependencies: { react: '1' } }) } : { deny: 'ENOENT' },
  )
  on('tool.call', { tool: 'Write' }, () => ({ deny: 'refused beneath' }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  const ran = await write($, '/work/src/Cart.tsx', CONDITIONAL)
  expect(ran.deny).toBe('refused beneath')
  expect(toasts).toEqual([])
})

test('judges the edit strings alone when the file cannot be read', async ($, on) => {
  project(on, ['react'])

  const ran = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/Missing.tsx',
    old_string: 'return null',
    new_string: 'if (ok) useEffect(() => {}, [])\n  return null',
    tool_use_id: 'e-missing',
  })
  expect(ran.context?.[0]).toContain('now calls useEffect inside a condition')
})

test('treats an unparsable package.json as no React', async ($, on) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', () => ({ value: '{ not json' }))
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  expect((await write($, '/work/src/Cart.tsx', CONDITIONAL)).context).toBeUndefined()
  expect(toasts).toEqual([])
})
