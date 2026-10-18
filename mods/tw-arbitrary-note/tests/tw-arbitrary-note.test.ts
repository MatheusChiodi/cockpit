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

const ARBITRARY = 'const a = <div className="w-[16px] mt-[8px] md:p-[1rem] text-[14px] z-[10] -mt-[4px]" />'

test('names the scale step for an arbitrary value that has one', async ($, on) => {
  const toasts = project(on, ['react', 'tailwindcss'])

  const ran = await write($, '/work/src/Card.tsx', ARBITRARY)
  const note = ran.context?.[0] ?? ''
  expect(note).toContain('tw-arbitrary-note: src/Card.tsx now uses an arbitrary value where the Tailwind scale has the step:')

  for (const detail of [
    'w-[16px] (use w-4)',
    'mt-[8px] (use mt-2)',
    'md:p-[1rem] (use md:p-4)',
    'text-[14px] (use text-sm)',
    'z-[10] (use z-10)',
    '-mt-[4px] (use -mt-1)',
  ]) {
    expect(note, detail).toContain(detail)
  }

  expect(toasts[0]).toBe('tw-arbitrary-note: arbitrary value (w-[16px] (use w-4)) in src/Card.tsx, Claude was told')
})

test('stays silent for values off the scale, units it cannot map and other arbitrary utilities', async ($, on) => {
  const toasts = project(on, ['react', 'tailwindcss'])

  const correct = `const a = (
  <div className="w-[13px] h-[100%] text-[15px] top-[calc(100%-4px)] bg-[#fff] w-4 p-[5px] z-[11] grid-cols-[1fr_2fr] max-w-[640px]" />
)`

  expect((await write($, '/work/src/Card.tsx', correct)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('judges only what an Edit adds', async ($, on) => {
  project(on, ['tailwindcss'], { '/work/src/Card.tsx': `${ARBITRARY}\nconst n = 1` })

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
    new_string: 'const b = <p className="gap-[24px]" />',
    tool_use_id: 'e2',
  })
  expect(added.context?.[0]).toContain('gap-[24px] (use gap-6)')
})

test('does nothing without Tailwind', async ($, on) => {
  const toasts = project(on, ['react'])

  expect((await write($, '/work/src/Card.tsx', ARBITRARY)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = project(on, ['tailwindcss'])
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await write($, '/work/src/Card.tsx', ARBITRARY)
  expect(toasts[0]).toBe('tw-arbitrary-note: valor arbitrário (w-[16px] (use w-4)) em src/Card.tsx, o Claude foi avisado')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const toasts = project(on, ['tailwindcss'])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await write($, '/work/src/Card.tsx', ARBITRARY)
  expect(toasts[0]).toBe('tw-arbitrary-note: valor arbitrario (w-[16px] (use w-4)) en src/Card.tsx, se avisó a Claude')
})

test('maps rem text sizes, the 1px step and zero, and detects NativeWind', async ($, on) => {
  project(on, ['nativewind'])

  const ran = await write($, '/work/src/Card.jsx', 'const a = <p className="text-[1.5rem] h-[1px] m-[0px]" />')
  const note = ran.context?.[0] ?? ''
  expect(note).toContain('text-[1.5rem] (use text-2xl)')
  expect(note).toContain('h-[1px] (use h-px)')
  expect(note).toContain('m-[0px] (use m-0)')
})

test('ignores files that are not JSX or TSX', async ($, on) => {
  const toasts = project(on, ['tailwindcss'])

  for (const file of ['/work/src/card.ts', '/work/src/card.css', '/work/README.md']) {
    expect((await write($, file, ARBITRARY)).context, file).toBeUndefined()
  }

  expect(toasts).toEqual([])
})

test('a Write that keeps the arbitrary values the file already had stays silent', async ($, on) => {
  const toasts = project(on, ['tailwindcss'], { '/work/src/Card.tsx': ARBITRARY })

  expect((await write($, '/work/src/Card.tsx', `${ARBITRARY}\nexport default 1`)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('an invalid package.json counts as no Tailwind', async ($, on) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) =>
    slashed(e.path).endsWith('/work/package.json') ? { value: '{ not json' } : { deny: 'ENOENT' },
  )
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  expect((await write($, '/work/src/Card.tsx', ARBITRARY)).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('passes a denied Write through untouched', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', () => ({ value: JSON.stringify({ dependencies: { tailwindcss: '4' } }) }))
  on('tool.call', { tool: 'Write' }, () => ({ deny: 'no writes' }))

  const ran = await write($, '/work/src/Card.tsx', ARBITRARY)
  expect(ran.deny).toBe('no writes')
  expect(ran.context).toBeUndefined()
})
