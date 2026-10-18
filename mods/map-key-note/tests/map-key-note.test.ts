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

const MISSING = 'const list = <ul>{items.map(item => <li>{item.name}</li>)}</ul>'

const INDEX = `const list = (
  <ul>
    {items.map((item, index) => (
      <li key={index}>{item.name}</li>
    ))}
  </ul>
)`

test('notes a mapped element without key and the array index used as key', async ($, on) => {
  const toasts = project(on, ['react'])

  const missing = await write($, '/work/src/List.tsx', MISSING)
  expect(missing.context?.[0]).toContain('map-key-note: src/List.tsx now has a mapped <li> without key')
  expect(missing.context?.[0]).toContain('Use a stable unique id from the data')
  expect(toasts[0]).toBe('map-key-note: a mapped <li> without key in src/List.tsx, Claude was told')

  const index = await write($, '/work/src/List.tsx', INDEX)
  expect(index.context?.[0]).toContain('key={index} (the array index) on a mapped <li>')

  const fragment = await write($, '/work/src/List.tsx', 'const a = rows.map(row => <><td>{row.a}</td></>)')
  expect(fragment.context?.[0]).toContain('a mapped <Fragment> without key')
})

test('stays silent for keyed lists, spreads, composite keys and maps that return no element', async ($, on) => {
  const toasts = project(on, ['react'])

  const correct = `const a = items.map(item => <li key={item.id}>{item.name}</li>)
const b = items.map((item, i) => <Row key={item.id} position={i} />)
const c = items.map(item => <Row {...item} />)
const d = items.map((item, i) => <li key={\`\${item.id}-\${i}\`}>{item.name}</li>)
const e = items.map(item => item.id)
const f = ids.map((id, i) => i < 3 && id > 1)`

  expect((await write($, '/work/src/List.tsx', correct)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('judges only what an Edit adds', async ($, on) => {
  project(on, ['react'], { '/work/src/List.tsx': `${MISSING}\nconst n = 1` })

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
    new_string: 'const rows = users.map(user => <tr><td>{user.name}</td></tr>)',
    tool_use_id: 'e2',
  })
  expect(added.context?.[0]).toContain('a mapped <tr> without key')
})

test('does nothing without React', async ($, on) => {
  const toasts = project(on, ['svelte'])

  expect((await write($, '/work/src/List.tsx', MISSING)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = project(on, ['react'])
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await write($, '/work/src/List.tsx', MISSING)
  expect(toasts[0]).toBe('map-key-note: a mapped <li> without key em src/List.tsx, o Claude foi avisado')
})

test('speaks Spanish when the hub says so', async ($, on) => {
  const toasts = project(on, ['react'])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await write($, '/work/src/List.tsx', MISSING)
  expect(toasts[0]).toBe('map-key-note: a mapped <li> without key en src/List.tsx, se avisó a Claude')
})

test('skips files that are not jsx or tsx', async ($, on) => {
  const toasts = project(on, ['react'])

  expect((await write($, '/work/src/list.ts', MISSING)).context).toBeUndefined()
  expect((await write($, '/work/src/list.js', MISSING)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('adds nothing to a write the engine refused', async ($, on) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_$, e) =>
    slashed(e.path).endsWith('package.json') ? { value: JSON.stringify({ dependencies: { react: '1' } }) } : { deny: 'ENOENT' },
  )
  on('tool.call', { tool: 'Write' }, () => ({ deny: 'refused' }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  const ran = await write($, '/work/src/List.tsx', MISSING)
  expect(ran.deny).toBe('refused')
  expect(ran.context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('notes the index wrapped in String() and finds React in devDependencies', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_$, e) =>
    slashed(e.path).endsWith('package.json')
      ? { value: JSON.stringify({ devDependencies: { react: '1' } }) }
      : { deny: 'ENOENT' },
  )
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))
  on('ui.toast', () => ({ value: undefined }))

  const ran = await write($, '/work/src/List.tsx', 'const a = xs.map((x, i) => <li key={String(i)}>{x}</li>)')
  expect(ran.context?.[0]).toContain('key={i} (the array index) on a mapped <li>')
})

test('stays silent when package.json is not valid JSON', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_$, e) => (slashed(e.path).endsWith('package.json') ? { value: '{ not json' } : { deny: 'ENOENT' }))
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))

  expect((await write($, '/work/src/List.tsx', MISSING)).context).toBeUndefined()
})

test('an Edit on an unreadable file judges the new text against the old one', async ($, on) => {
  project(on, ['react'])

  const ran = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/New.tsx',
    old_string: 'const a = 1',
    new_string: 'const a = xs.map(x => <Item>{x}</Item>)',
    tool_use_id: 'e-unreadable',
  })
  expect(ran.context?.[0]).toContain('a mapped <Item> without key')
})

test('an Edit with replace_all counts every new unkeyed map', async ($, on) => {
  project(on, ['react'], { '/work/src/Many.tsx': 'A\nA\n' })

  const ran = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/Many.tsx',
    old_string: 'A',
    new_string: 'xs.map(x => <b>{x}</b>)',
    replace_all: true,
    tool_use_id: 'e-all',
  })
  expect(ran.context?.[0]).toContain('src/Many.tsx now has a mapped <b> without key.')
})
