import { expect, test } from 'claude-code/testing'

declare const setTimeout: (run: () => void, ms: number) => unknown

// The status line is written unawaited by the mod: give it a moment to land.
const flush = () => new Promise(resolve => setTimeout(() => resolve(undefined), 30))

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

// The world beneath the mod: files by path, the hub, the tools that always pass, and the status line recorded.
const world = (on: any, files: Record<string, string> = {}, off: string[] = [], lang = 'en') => {
  const status: (string | undefined)[] = []

  on('fs.read', (_: unknown, e: { path: string }) => ({ value: files[e.path.replaceAll('\\', '/').split('/').pop() ?? ''] as never }))
  on('tool.call', { tool: 'Edit' }, () => ANSWER)
  on('tool.call', { tool: 'Write' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: off, version: 1 } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

const edit = async ($: any, file_path: string, old_string: string, new_string: string) => {
  await $.tool.call({ tool: 'Edit', file_path, old_string, new_string, tool_use_id: `e-${file_path}-${new_string}` })
  await flush()
}

test('counts the markers an edit adds, across edits', async ($, on) => {
  const status = world(on)

  await edit($, '/src/a.ts', 'x', '// TODO: handle errors\n// FIXME later')
  expect(status.at(-1)).toBe('todo +2 new')

  await edit($, '/src/b.ts', 'y', 'const z = 1 // HACK')
  expect(status.at(-1)).toBe('todo +3 new')
})

test('an edit that removes or keeps markers adds nothing', async ($, on) => {
  const status = world(on)

  await edit($, '/src/a.ts', '// TODO: old', '// TODO: new')
  await edit($, '/src/a.ts', '// TODO: old', 'done')
  expect(status).toEqual([])
})

test('a write counts only the markers the file did not have', async ($, on) => {
  const status = world(on, { 'a.ts': '// TODO one\n' })

  await $.tool.call({ tool: 'Write', file_path: '/src/a.ts', content: '// TODO one\n// TODO two\n', tool_use_id: 'w-1' })
  await flush()
  expect(status.at(-1)).toBe('todo +1 new')

  await $.tool.call({ tool: 'Write', file_path: '/src/new.ts', content: '// FIXME a\n// FIXME b\n', tool_use_id: 'w-2' })
  await flush()
  expect(status.at(-1)).toBe('todo +3 new')
})

test('ignores notes and docs', async ($, on) => {
  const status = world(on)

  await edit($, '/docs/plan.md', 'x', '- TODO write the intro')
  await $.tool.call({ tool: 'Write', file_path: '/notes.txt', content: 'TODO', tool_use_id: 'w-3' })
  await flush()
  expect(status).toEqual([])
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const status = world(on, {}, ['todo-new-status'])

  await edit($, '/src/a.ts', 'x', '// TODO')
  expect(status.every(text => text === undefined)).toBe(true)
})

test('speaks the language set in the hub', async ($, on) => {
  const status = world(on, {}, [], 'pt')

  await edit($, '/src/a.ts', 'x', '// TODO\n// TODO')
  expect(status.at(-1)).toBe('todo +2 novos')
})

test('a refused or failed edit adds nothing', async ($, on) => {
  const status: (string | undefined)[] = []
  on('tool.call', { tool: 'Edit' }, (_: unknown, e: { file_path: string }) =>
    e.file_path.endsWith('a.ts') ? { deny: 'blocked' } : ({ ...ANSWER, isError: true } as never),
  )
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })

  await edit($, '/src/a.ts', 'x', '// TODO')
  await edit($, '/src/b.ts', 'x', '// TODO')
  expect(status).toEqual([])
})

test('counts XXX but not names that only contain a marker', async ($, on) => {
  const status = world(on)

  await edit($, '/src/a.ts', 'x', 'const TODO_LIST = []\nconst FIXMEs = 1\n// XXX remove')
  expect(status.at(-1)).toBe('todo +1 new')
})

test('a new session starts the count again and clears the entry', async ($, on) => {
  const status = world(on)
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))

  await edit($, '/src/a.ts', 'x', '// TODO')
  expect(status.at(-1)).toBe('todo +1 new')

  await $.session.start({ cwd: '/repo', surface: null, isInteractive: true })
  await flush()
  expect(status.at(-1)).toBeUndefined()

  await edit($, '/src/a.ts', 'y', '// FIXME')
  expect(status.at(-1)).toBe('todo +1 new')
})

test('speaks Spanish, singular and plural', async ($, on) => {
  const status = world(on, {}, [], 'es')

  await edit($, '/src/a.ts', 'x', '// TODO')
  expect(status.at(-1)).toBe('todo +1 nuevo')

  await edit($, '/src/b.ts', 'x', '// HACK')
  expect(status.at(-1)).toBe('todo +2 nuevos')
})
