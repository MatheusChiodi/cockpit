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

const MAPPED = `export const Feed = () => (
  <ScrollView contentContainerStyle={{ padding: 8 }}>
    {posts.map(post => (
      <Post key={post.id} post={post} />
    ))}
  </ScrollView>
)`

const NESTED = `export const Feed = () => (
  <ScrollView>
    <Header />
    <FlatList data={posts} renderItem={renderPost} />
  </ScrollView>
)`

test('notes a mapped list inside a vertical ScrollView and a FlatList nested in one', async ($, on) => {
  const toasts = project(on, ['react', 'react-native'])

  const mapped = await write($, '/work/src/Feed.tsx', MAPPED)
  expect(mapped.context?.[0]).toContain('flatlist-note: src/Feed.tsx now has a mapped list inside a ScrollView')
  expect(mapped.context?.[0]).toContain('<FlatList data renderItem keyExtractor>')
  expect(toasts[0]).toBe('flatlist-note: a mapped list inside a ScrollView in src/Feed.tsx, Claude was told to use a FlatList')

  const nested = await write($, '/work/src/Feed.tsx', NESTED)
  expect(nested.context?.[0]).toContain('a vertical FlatList nested in a ScrollView')
})

test('stays silent for horizontal scrollers, plain FlatLists and maps outside the ScrollView', async ($, on) => {
  const toasts = project(on, ['react', 'react-native'])

  const correct = `export const Feed = () => (
  <>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {tags.map(tag => (
        <Chip key={tag} tag={tag} />
      ))}
    </ScrollView>
    <ScrollView>
      <Text>Settings</Text>
      <ScrollView horizontal>
        <FlatList horizontal data={tags} renderItem={renderTag} />
      </ScrollView>
    </ScrollView>
    <FlatList data={posts} renderItem={renderPost} keyExtractor={post => post.id} />
    <View>{rows.map(row => <Row key={row.id} />)}</View>
  </>
)
const Closed = () => <ScrollView />`

  expect((await write($, '/work/src/Feed.tsx', correct)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('judges only what an Edit adds', async ($, on) => {
  project(on, ['react-native'], { '/work/src/Feed.tsx': `${MAPPED}\nconst n = 1` })

  const kept = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/Feed.tsx',
    old_string: 'const n = 1',
    new_string: 'const n = 2',
    tool_use_id: 'e1',
  })
  expect(kept.context).toBeUndefined()

  const added = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/Feed.tsx',
    old_string: 'const n = 1',
    new_string: NESTED,
    tool_use_id: 'e2',
  })
  expect(added.context?.[0]).toContain('a vertical FlatList nested in a ScrollView')
})

test('does nothing in a project without React Native', async ($, on) => {
  const toasts = project(on, ['react', 'react-dom'])

  expect((await write($, '/work/src/Feed.tsx', MAPPED)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = project(on, ['react-native'])
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await write($, '/work/src/Feed.tsx', MAPPED)
  expect(toasts[0]).toBe('flatlist-note: a mapped list inside a ScrollView em src/Feed.tsx, o Claude foi avisado para usar um FlatList')
})

// Like `project`, but the tool answers with an error or a refusal.
const failing = (on: any, answer: object) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) =>
    slashed(e.path).endsWith('/work/package.json')
      ? { value: JSON.stringify({ dependencies: { 'react-native': '1' } }) }
      : { deny: 'ENOENT' },
  )
  on('tool.call', { tool: 'Write' }, () => answer)
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return toasts
}

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const toasts = project(on, ['react-native'])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await write($, '/work/src/Feed.tsx', MAPPED)
  expect(toasts[0]).toBe('flatlist-note: a mapped list inside a ScrollView en src/Feed.tsx, se avisó a Claude que use un FlatList')
})

test('the note for the model stays in English whatever the hub language', async ($, on) => {
  project(on, ['react-native'])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const ran = await write($, '/work/src/Feed.tsx', MAPPED)
  expect(ran.context?.[0]).toContain('ScrollView mounts every child at once')
})

test('names both findings in one note when a file adds both', async ($, on) => {
  const toasts = project(on, ['react-native'])
  const both = `export const Feed = () => (
  <ScrollView>
    {posts.map(post => <Post key={post.id} />)}
    <FlatList data={posts} renderItem={renderPost} />
  </ScrollView>
)`

  const ran = await write($, '/work/src/Feed.tsx', both)
  expect(ran.context).toHaveLength(1)
  expect(ran.context?.[0]).toContain('a mapped list inside a ScrollView and a vertical FlatList nested in a ScrollView')
  expect(toasts).toHaveLength(1)
})

test('looks only at jsx and tsx files', async ($, on) => {
  const toasts = project(on, ['react-native'])

  expect((await write($, '/work/src/Feed.ts', MAPPED)).context).toBeUndefined()
  expect((await write($, '/work/src/Feed.js', MAPPED)).context).toBeUndefined()
  expect((await write($, '/work/src/Feed.JSX', MAPPED)).context?.[0]).toContain('flatlist-note')
  expect(toasts).toHaveLength(1)
})

test('a map that returns no JSX is not a list to virtualize', async ($, on) => {
  project(on, ['react-native'])
  const plain = `const Feed = () => (
  <ScrollView>
    <Text>{names.map(name => name.trim()).join(', ')}</Text>
  </ScrollView>
)`

  expect((await write($, '/work/src/Feed.tsx', plain)).context).toBeUndefined()
})

test('an Edit on an unreadable file is judged by its own strings', async ($, on) => {
  project(on, ['react-native'])

  const ran = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/Missing.tsx',
    old_string: '<View />',
    new_string: NESTED,
    tool_use_id: 'e-missing',
  })
  expect(ran.context?.[0]).toContain('src/Missing.tsx now has a vertical FlatList nested in a ScrollView')
})

test('ignores an invalid package.json', async ($, on) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', () => ({ value: '{ not json' }))
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  expect((await write($, '/work/src/Feed.tsx', MAPPED)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('notes a project whose React Native is a devDependency', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) =>
    slashed(e.path).endsWith('/work/package.json')
      ? { value: JSON.stringify({ devDependencies: { 'react-native': '1' } }) }
      : { deny: 'ENOENT' },
  )
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))
  on('ui.toast', () => ({ value: undefined }))

  expect((await write($, '/work/src/Feed.tsx', MAPPED)).context?.[0]).toContain('flatlist-note')
})

test('adds no note when the write failed', async ($, on) => {
  const toasts = failing(on, { isError: true, result: 'disk full' })

  const ran = await write($, '/work/src/Feed.tsx', MAPPED)
  expect(ran.isError).toBe(true)
  expect(ran.context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('adds no note when the write was refused', async ($, on) => {
  const toasts = failing(on, { deny: 'not allowed' })

  const ran = await write($, '/work/src/Feed.tsx', MAPPED)
  expect(ran.deny).toBe('not allowed')
  expect(toasts).toEqual([])
})
