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

const PUSH = `function Todos() {
  const [todos, setTodos] = useState([])
  const add = (todo) => {
    todos.push(todo)
    setTodos(todos)
  }
  return null
}`

test('notes push, sort and property assignment on a useState value', async ($, on) => {
  const toasts = project(on, ['react'])

  const push = await write($, '/work/src/Todos.tsx', PUSH)
  expect(push.context?.[0]).toContain('state-mutation-note: src/Todos.tsx now changes state in place: todos.push(…)')
  expect(push.context?.[0]).toContain('setItems([...items, x])')
  expect(toasts[0]).toBe('state-mutation-note: state changed in place (todos.push(…)) in src/Todos.tsx, Claude was told')

  const assign = await write(
    $,
    '/work/src/Profile.tsx',
    `function P() {\n  const [user, setUser] = useState({ name: '' })\n  const rename = () => {\n    user.name = 'x'\n    user.tags[0] = 'y'\n    setUser(user)\n  }\n}`,
  )
  expect(assign.context?.[0]).toContain("user.name = …")
  expect(assign.context?.[0]).toContain('user.tags[0] = …')

  const sort = await write($, '/work/src/Todos.tsx', `function T() {\n  const [rows, setRows] = useState([])\n  setRows(rows.sort())\n}`)
  expect(sort.context?.[0]).toContain('rows.sort(…)')
})

test('stays silent for copies, reads, refs and a local variable of the same name', async ($, on) => {
  const toasts = project(on, ['react'])

  const correct = `function Todos() {
  const [todos, setTodos] = useState([])
  const [user, setUser] = useState({ name: '' })
  const listRef = useRef([])
  const add = (todo) => {
    setTodos([...todos, todo])
    setTodos(todos.filter(item => item.done))
    setTodos([...todos].sort())
    const copy = todos.slice()
    copy.push(todo)
    listRef.current.push(todo)
    setUser({ ...user, name: 'x' })
    if (user.name === 'x' && todos.length === 1) return
  }
}`

  expect((await write($, '/work/src/Todos.tsx', correct)).context).toBeUndefined()

  const shadowed = `function T() {\n  const [items, setItems] = useState([])\n  const make = () => {\n    const items = []\n    items.push(1)\n    return items\n  }\n}`
  expect((await write($, '/work/src/T.tsx', shadowed)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('judges only what an Edit adds', async ($, on) => {
  project(on, ['react'], { '/work/src/Todos.tsx': PUSH })

  const kept = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/Todos.tsx',
    old_string: 'return null',
    new_string: 'return <p />',
    tool_use_id: 'e1',
  })
  expect(kept.context).toBeUndefined()

  const added = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/Todos.tsx',
    old_string: 'return null',
    new_string: 'todos.splice(0, 1)\n  return null',
    tool_use_id: 'e2',
  })
  expect(added.context?.[0]).toContain('todos.splice(…)')
})

test('does nothing without React', async ($, on) => {
  const toasts = project(on, ['svelte'])

  expect((await write($, '/work/src/Todos.tsx', PUSH)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = project(on, ['react'])
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await write($, '/work/src/Todos.tsx', PUSH)
  expect(toasts[0]).toBe('state-mutation-note: estado alterado no lugar (todos.push(…)) em src/Todos.tsx, o Claude foi avisado')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const toasts = project(on, ['react'])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await write($, '/work/src/Todos.tsx', PUSH)
  expect(toasts[0]).toBe('state-mutation-note: estado cambiado en el lugar (todos.push(…)) en src/Todos.tsx, se avisó a Claude')
})

test('notes React.useState, compound assignment and increments', async ($, on) => {
  project(on, ['react'])
  const text = `function C() {
  const [count, setCount] = React.useState({ n: 0 })
  const bump = () => {
    count.n += 1
    count.total++
    setCount(count)
  }
}`

  const ran = await write($, '/work/src/C.tsx', text)
  expect(ran.context?.[0]).toContain('count.n +=')
  expect(ran.context?.[0]).toContain('count.total++')
})

test('notes every mutator method', async ($, on) => {
  project(on, ['react'])

  for (const method of ['pop', 'shift', 'unshift', 'reverse', 'fill', 'copyWithin']) {
    const ran = await write($, '/work/src/L.tsx', `function L() {\n  const [list, setList] = useState([])\n  list.${method}(0)\n}`)
    expect(ran.context?.[0], method).toContain(`list.${method}(…)`)
  }
})

test('looks only at jsx and tsx files', async ($, on) => {
  const toasts = project(on, ['react'])

  expect((await write($, '/work/src/todos.ts', PUSH)).context).toBeUndefined()
  expect((await write($, '/work/src/todos.js', PUSH)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('a comparison on a state field is not an assignment', async ($, on) => {
  project(on, ['react'])
  const text = `function C() {\n  const [user, setUser] = useState({})\n  const ok = user.name == 'x' || user.age === 3\n  const fn = user.cb => 1\n}`

  expect((await write($, '/work/src/C.tsx', text)).context).toBeUndefined()
})

test('the note keeps the path given when it lies outside the project', async ($, on) => {
  project(on, ['react'])

  const ran = await write($, '/elsewhere/Todos.tsx', PUSH)
  expect(ran.context?.[0]).toContain('/elsewhere/Todos.tsx now changes state in place')
})

test('adds no note when the write failed', async ($, on) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) =>
    slashed(e.path).endsWith('/work/package.json') ? { value: JSON.stringify({ dependencies: { react: '1' } }) } : { deny: 'ENOENT' },
  )
  on('tool.call', { tool: 'Write' }, () => ({ isError: true, result: 'disk full' }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  expect((await write($, '/work/src/Todos.tsx', PUSH)).context).toBeUndefined()
  expect(toasts).toEqual([])
})
