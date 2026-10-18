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

const CONFLICT = 'const a = <div className="p-4 flex hidden text-sm text-lg p-2" />'

test('notes two classes that set the same property on one element', async ($, on) => {
  const toasts = project(on, ['react', 'tailwindcss'])

  const ran = await write($, '/work/src/Card.tsx', CONFLICT)
  expect(ran.context?.[0]).toContain('tw-conflict-note: src/Card.tsx now has conflicting Tailwind classes on one element:')
  expect(ran.context?.[0]).toContain('flex and hidden; text-sm and text-lg; p-4 and p-2')
  expect(toasts[0]).toBe('tw-conflict-note: conflicting classes (flex and hidden) in src/Card.tsx, Claude was told')

  const helper = await write($, '/work/src/Card.tsx', `const a = <div className={cn('mt-2 mt-4', open && 'p-1')} />`)
  expect(helper.context?.[0]).toContain('mt-2 and mt-4')

  const variant = await write($, '/work/src/Card.tsx', `const a = <div className="md:p-2 md:p-4 text-red-500 text-blue-600" />`)
  expect(variant.context?.[0]).toContain('md:p-2 and md:p-4')
  expect(variant.context?.[0]).toContain('text-red-500 and text-blue-600')
})

test('stays silent for different properties, different variants and separate literals', async ($, on) => {
  const toasts = project(on, ['react', 'tailwindcss'])

  const correct = `const a = (
  <div className="p-4 md:p-2 hover:p-3 px-2 flex flex-col items-center justify-between text-sm text-red-500 bg-white" />
)
const b = <div className="hidden md:flex" />
const c = <div className="text-center text-lg text-white dark:text-black" />
const d = <div className={cn('p-4', open && 'p-2')} />
const e = <div className="w-[calc(100%-1rem)] h-4" />`

  expect((await write($, '/work/src/Card.tsx', correct)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('judges only what an Edit adds', async ($, on) => {
  project(on, ['tailwindcss'], { '/work/src/Card.tsx': `${CONFLICT}\nconst n = 1` })

  const kept = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/Card.tsx',
    old_string: 'const n = 1',
    new_string: 'const n = 2',
    tool_use_id: 'e1',
  })
  expect(kept.context).toBeUndefined()

  const added = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/Card.tsx',
    old_string: 'const n = 1',
    new_string: 'const b = <p className="font-bold font-light" />',
    tool_use_id: 'e2',
  })
  expect(added.context?.[0]).toContain('font-bold and font-light')
})

test('does nothing without Tailwind', async ($, on) => {
  const toasts = project(on, ['react', 'styled-components'])

  expect((await write($, '/work/src/Card.tsx', CONFLICT)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = project(on, ['tailwindcss'])
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await write($, '/work/src/Card.tsx', CONFLICT)
  expect(toasts[0]).toBe('tw-conflict-note: classes em conflito (flex and hidden) em src/Card.tsx, o Claude foi avisado')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const toasts = project(on, ['tailwindcss'])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await write($, '/work/src/Card.tsx', CONFLICT)
  expect(toasts[0]).toBe('tw-conflict-note: clases en conflicto (flex and hidden) en src/Card.tsx, se avisó a Claude')
})

test('ignores files that are not jsx or tsx', async ($, on) => {
  const toasts = project(on, ['tailwindcss'])

  expect((await write($, '/work/src/card.ts', CONFLICT)).context).toBeUndefined()
  expect((await write($, '/work/src/card.html', CONFLICT)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('detects NativeWind projects and the important prefix', async ($, on) => {
  project(on, ['nativewind'])

  const ran = await write($, '/work/App.jsx', 'const a = <View className="!p-2 p-4" />')
  expect(ran.context?.[0]).toContain('!p-2 and p-4')
})

test('leaves a denied write alone', async ($, on) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', () => ({ value: JSON.stringify({ dependencies: { tailwindcss: '1' } }) }))
  on('tool.call', { tool: 'Write' }, () => ({ deny: 'nope' }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  const ran = await write($, '/work/src/Card.tsx', CONFLICT)
  expect(ran.deny).toBe('nope')
  expect(ran.context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('an Edit with replace_all judges every replacement', async ($, on) => {
  project(on, ['tailwindcss'], { '/work/src/Card.tsx': 'const a = <p className="X" />\nconst b = <p className="X" />' })

  const ran = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/Card.tsx',
    old_string: 'X',
    new_string: 'm-1 m-2',
    replace_all: true,
    tool_use_id: 'ra1',
  })
  expect(ran.context?.[0]).toContain('m-1 and m-2')
})

test('an invalid package.json means no stack and no note', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', () => ({ value: '{ not json' }))
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))

  expect((await write($, '/work/src/Card.tsx', CONFLICT)).context).toBeUndefined()
})
