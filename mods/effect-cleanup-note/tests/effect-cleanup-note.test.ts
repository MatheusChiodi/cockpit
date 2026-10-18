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

const INTERVAL = `function Clock() {
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
  }, [])
  return null
}`

test('notes an effect that starts an interval, a listener or a subscription and returns nothing', async ($, on) => {
  const toasts = project(on, ['react'])

  const interval = await write($, '/work/src/Clock.tsx', INTERVAL)
  expect(interval.context?.[0]).toContain('effect-cleanup-note: src/Clock.tsx now has an effect that starts setInterval in an effect and returns nothing')
  expect(interval.context?.[0]).toContain('return () => clearInterval(id)')
  expect(toasts[0]).toBe('effect-cleanup-note: setInterval in an effect without cleanup in src/Clock.tsx, Claude was told')

  const listener = await write($, '/work/src/Size.tsx', `useEffect(() => {\n  window.addEventListener('resize', onResize)\n}, [])`)
  expect(listener.context?.[0]).toContain('addEventListener in an effect')

  const subscribe = await write($, '/work/src/Feed.tsx', `useLayoutEffect(function () {\n  store.subscribe(render)\n}, [])`)
  expect(subscribe.context?.[0]).toContain('subscribe in an effect')
})

test('stays silent when the effect returns a cleanup, or starts nothing that needs one', async ($, on) => {
  const toasts = project(on, ['react'])

  const correct = `function Clock() {
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  useEffect(() => {
    load(id).then(setData)
  }, [id])
  useEffect(() => void (document.title = title), [title])
}`

  expect((await write($, '/work/src/Clock.tsx', correct)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('judges only what an Edit adds', async ($, on) => {
  project(on, ['react'], { '/work/src/Clock.tsx': `${INTERVAL}\nconst n = 1` })

  const kept = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/Clock.tsx',
    old_string: 'const n = 1',
    new_string: 'const n = 2',
    tool_use_id: 'e1',
  })
  expect(kept.context).toBeUndefined()

  const added = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/Clock.tsx',
    old_string: 'const n = 1',
    new_string: `useEffect(() => {\n  socket.addListener(onMessage)\n}, [])`,
    tool_use_id: 'e2',
  })
  expect(added.context?.[0]).toContain('addListener in an effect')
})

test('does nothing without React', async ($, on) => {
  const toasts = project(on, ['svelte'])

  expect((await write($, '/work/src/Clock.tsx', INTERVAL)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = project(on, ['react'])
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await write($, '/work/src/Clock.tsx', INTERVAL)
  expect(toasts[0]).toBe('effect-cleanup-note: setInterval in an effect sem limpeza em src/Clock.tsx, o Claude foi avisado')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const toasts = project(on, ['react'])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await write($, '/work/src/Clock.tsx', INTERVAL)
  expect(toasts[0]).toBe('effect-cleanup-note: setInterval in an effect sin limpieza en src/Clock.tsx, se avisó a Claude')
})

test('notes a WebSocket opened in an async arrow effect', async ($, on) => {
  project(on, ['react'])

  const ran = await write($, '/work/src/Live.jsx', `useEffect(async () => {\n  const ws = new WebSocket(url)\n}, [url])`)
  expect(ran.context?.[0]).toContain('WebSocket in an effect')
})

test('stays silent for a subscription outside an effect and for .ts files', async ($, on) => {
  const toasts = project(on, ['react'])

  expect((await write($, '/work/src/store.tsx', 'const off = store.subscribe(render)\n')).context).toBeUndefined()
  expect((await write($, '/work/src/clock.ts', INTERVAL)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('judges the edit strings alone when the file cannot be read', async ($, on) => {
  project(on, ['react'])

  const ran = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/Missing.tsx',
    old_string: 'return null',
    new_string: `useEffect(() => {\n  setInterval(tick, 10)\n}, [])\n  return null`,
    tool_use_id: 'e-missing',
  })
  expect(ran.context?.[0]).toContain('setInterval in an effect')
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

  const ran = await write($, '/work/src/Clock.tsx', INTERVAL)
  expect(ran.deny).toBe('refused beneath')
  expect(toasts).toEqual([])
})
