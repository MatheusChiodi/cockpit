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

const DYNAMIC = 'const a = <span className={`bg-${color}-500 p-2`} />'
const BUILT = 'const a = <div className={`p-2 ${active ? "bg-blue-500" : "bg-gray-100"}`} />'

test('notes a class assembled from a fragment as a bug Tailwind never generates', async ($, on) => {
  const toasts = project(on, ['react', 'tailwindcss'])

  const template = await write($, '/work/src/Badge.tsx', DYNAMIC)
  expect(template.context?.[0]).toContain('classname-build-note: src/Badge.tsx now has a class assembled from a fragment (bg-${color}-500)')
  expect(template.context?.[0]).toContain('is never generated')
  expect(toasts[0]).toBe('classname-build-note: a class assembled from a fragment (bg-${color}-500) in src/Badge.tsx, Claude was told')

  const concat = await write($, '/work/src/Badge.tsx', `const a = <span className={'text-' + size} />`)
  expect(concat.context?.[0]).toContain("a class assembled from a fragment ('text-' + size)")
})

test('notes a className built by concatenation and names the project helper', async ($, on) => {
  project(on, ['react', 'tailwindcss', 'clsx'])

  const built = await write($, '/work/src/Badge.tsx', BUILT)
  expect(built.context?.[0]).toContain('a className built by concatenation')
  expect(built.context?.[0]).toContain("the project's clsx")

  const plus = await write($, '/work/src/Badge.tsx', `const a = <p className={'p-2 ' + (active ? 'a' : 'b')} />`)
  expect(plus.context?.[0]).toContain('a className built by concatenation')
})

test('suggests a small helper when the project has none', async ($, on) => {
  project(on, ['react', 'tailwindcss'])

  const built = await write($, '/work/src/Badge.tsx', BUILT)
  expect(built.context?.[0]).toContain('a small helper that joins the truthy parts')
})

test('stays silent for helpers, lookups, plain strings and templates without a condition', async ($, on) => {
  const toasts = project(on, ['react', 'tailwindcss', 'clsx'])

  const correct = `const a = <div className={cn('p-2', active && 'bg-blue-500')} />
const b = <div className="p-2 bg-blue-500" />
const c = <div className={styles.box} />
const d = <div className={COLORS[color]} />
const e = <div className={\`p-2 \${props.className}\`} />
const f = <div className={clsx('p-2', { 'bg-blue-500': active })} />`

  expect((await write($, '/work/src/Badge.tsx', correct)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('judges only what an Edit adds', async ($, on) => {
  project(on, ['tailwindcss'], { '/work/src/Badge.tsx': `${DYNAMIC}\nconst n = 1` })

  const kept = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/Badge.tsx',
    old_string: 'const n = 1',
    new_string: 'const n = 2',
    tool_use_id: 'e1',
  })
  expect(kept.context).toBeUndefined()

  const added = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/Badge.tsx',
    old_string: 'const n = 1',
    new_string: 'const b = <p className={`mt-${gap}`} />',
    tool_use_id: 'e2',
  })
  expect(added.context?.[0]).toContain('(mt-${gap})')
})

test('does nothing without Tailwind', async ($, on) => {
  const toasts = project(on, ['react'])

  expect((await write($, '/work/src/Badge.tsx', DYNAMIC)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = project(on, ['tailwindcss'])
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await write($, '/work/src/Badge.tsx', DYNAMIC)
  expect(toasts[0]).toBe('classname-build-note: a class assembled from a fragment (bg-${color}-500) em src/Badge.tsx, o Claude foi avisado')
})

test('looks only at .jsx and .tsx files', async ($, on) => {
  const toasts = project(on, ['tailwindcss'])

  expect((await write($, '/work/src/badge.ts', DYNAMIC)).context).toBeUndefined()
  expect((await write($, '/work/src/badge.md', DYNAMIC)).context).toBeUndefined()
  expect((await write($, '/work/src/Badge.jsx', DYNAMIC)).context?.[0]).toContain('src/Badge.jsx now has')
  expect(toasts).toHaveLength(1)
})

test('says nothing about a write that was refused beneath', async ($, on) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) =>
    slashed(e.path).endsWith('/work/package.json')
      ? { value: JSON.stringify({ dependencies: { tailwindcss: '1' } }) }
      : { deny: 'ENOENT' },
  )
  on('tool.call', { tool: 'Write' }, () => ({ deny: 'not allowed' }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  const answer = await write($, '/work/src/Badge.tsx', DYNAMIC)
  expect(answer.deny).toBe('not allowed')
  expect(answer.context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('recognises nativewind as Tailwind and names tailwind-merge as the helper', async ($, on) => {
  project(on, ['nativewind', 'tailwind-merge', 'clsx'])

  const built = await write($, '/work/app/Card.tsx', BUILT)
  expect(built.context?.[0]).toContain("the project's twMerge (usually behind a cn helper)")
})

test('an Edit on a file it cannot read is judged on the strings it swaps', async ($, on) => {
  project(on, ['@tailwindcss/vite'])

  const answer = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/New.tsx',
    old_string: 'const n = 1',
    new_string: 'const b = <p className={`gap-${n}`} />',
    tool_use_id: 'e-missing',
  })
  expect(answer.context?.[0]).toContain('(gap-${n})')
})

test('an Edit with replace_all counts every copy it adds', async ($, on) => {
  project(on, ['tailwindcss'], { '/work/src/List.tsx': `${DYNAMIC}\nTODO\nTODO` })

  const answer = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/List.tsx',
    old_string: 'TODO',
    new_string: DYNAMIC,
    replace_all: true,
    tool_use_id: 'e-all',
  })
  expect(answer.context?.[0]).toContain('(bg-${color}-500)')
})

test('speaks Spanish in the toast when the hub language is es', async ($, on) => {
  const toasts = project(on, ['tailwindcss'])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await write($, '/work/src/Badge.tsx', BUILT)
  expect(toasts[0]).toBe('classname-build-note: a className built by concatenation en src/Badge.tsx, se avisó a Claude')
  // The note is read by the model: always English.
  expect(answer.context?.[0]).toContain('now has a className built by concatenation')
})
