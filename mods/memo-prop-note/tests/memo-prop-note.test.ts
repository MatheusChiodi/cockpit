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

const ROW = `const Row = memo(function Row({ item, onPick }) {
  return <li onClick={onPick}>{item}</li>
})
`

test('notes an inline function, object or array passed to a memoized component', async ($, on) => {
  const toasts = project(on, ['react'])

  const code = `${ROW}function List() {
  return <Row item={1} onPick={() => pick(1)} style={{ color: 'red' }} tags={['a']} />
}`
  const ran = await write($, '/work/src/List.tsx', code)
  expect(ran.context?.[0]).toContain('memo-prop-note: src/List.tsx now passes a new object, array or function on every render')
  expect(ran.context?.[0]).toContain('<Row onPick={…}>, <Row style={…}>, <Row tags={…}>')
  expect(toasts[0]).toBe('memo-prop-note: <Row onPick={…}> defeats memo in src/List.tsx, Claude was told')

  const wrapped = await write($, '/work/src/Card.tsx', `function Card() {}\nexport default React.memo(Card)\nconst a = <Card onClick={function () { go() }} />`)
  expect(wrapped.context?.[0]).toContain('<Card onClick={…}>')
})

test('stays silent for stable props, components without memo and spread props', async ($, on) => {
  const toasts = project(on, ['react'])

  const correct = `${ROW}function Plain() { return null }
function List() {
  const pick = useCallback(() => go(), [])
  const style = useMemo(() => ({ color: 'red' }), [])
  return (
    <>
      <Row item={1} onPick={pick} style={style} />
      <Row item={items.map(i => i.id)} {...rest} />
      <Plain onPick={() => pick(1)} style={{ color: 'red' }} />
    </>
  )
}`

  expect((await write($, '/work/src/List.tsx', correct)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('judges only what an Edit adds', async ($, on) => {
  project(on, ['react'], { '/work/src/List.tsx': `${ROW}const a = <Row onPick={() => 1} />\nconst n = 1` })

  const kept = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/List.tsx',
    old_string: 'const n = 1',
    new_string: 'const n = 2',
    tool_use_id: 'e1',
  })
  expect(kept.context).toBeUndefined()

  const added = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/List.tsx',
    old_string: 'const n = 1',
    new_string: 'const b = <Row style={{ margin: 1 }} />',
    tool_use_id: 'e2',
  })
  expect(added.context?.[0]).toContain('<Row style={…}>')
})

test('does nothing without React', async ($, on) => {
  const toasts = project(on, ['svelte'])

  expect((await write($, '/work/src/List.tsx', `${ROW}const a = <Row onPick={() => 1} />`)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = project(on, ['react'])
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await write($, '/work/src/List.tsx', `${ROW}const a = <Row onPick={() => 1} />`)
  expect(toasts[0]).toBe('memo-prop-note: <Row onPick={…}> anula o memo em src/List.tsx, o Claude foi avisado')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const toasts = project(on, ['react'])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await write($, '/work/src/List.tsx', `${ROW}const a = <Row onPick={() => 1} />`)
  expect(toasts[0]).toBe('memo-prop-note: <Row onPick={…}> anula el memo en src/List.tsx, se avisó a Claude')
})

test('ignores files that are not jsx or tsx', async ($, on) => {
  const toasts = project(on, ['react'])

  expect((await write($, '/work/src/list.ts', `${ROW}const a = <Row onPick={() => 1} />`)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('finds React in devDependencies and notes async arrows', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) =>
    slashed(e.path).endsWith('/work/package.json')
      ? { value: JSON.stringify({ devDependencies: { react: '1' } }) }
      : { deny: 'ENOENT' },
  )
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))

  const ran = await write($, '/work/src/List.jsx', `${ROW}const a = <Row onPick={async () => load()} />`)
  expect(ran.context?.[0]).toContain('<Row onPick={…}>')
})

test('leaves an errored write alone', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', () => ({ value: JSON.stringify({ dependencies: { react: '1' } }) }))
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never, isError: true }))

  const ran = await write($, '/work/src/List.tsx', `${ROW}const a = <Row onPick={() => 1} />`)
  expect(ran.context).toBeUndefined()
})

test('keeps the absolute path for a file outside the project', async ($, on) => {
  const toasts = project(on, ['react'])

  await write($, '/elsewhere/List.tsx', `${ROW}const a = <Row onPick={() => 1} />`)
  expect(toasts[0]).toContain('in /elsewhere/List.tsx')
})
