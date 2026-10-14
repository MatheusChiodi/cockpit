import { expect, test } from 'claude-code/testing'

const fileOf = (path: string) => path.replaceAll('\\', '/').split('/').pop() ?? ''

// A project at /work with the files named in `files`; returns the toasts the mod shows.
const project = (on: any, files: Record<string, string>) => {
  const toasts: string[] = []

  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) =>
    fileOf(e.path) in files ? { value: files[fileOf(e.path)] } : { deny: 'ENOENT' },
  )
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return toasts
}

const EXAMPLE = '# keys only\nDATABASE_URL=\nexport API_URL=http://localhost\n'

const write = ($: any, content: string, file_path = '/work/src/pay.ts') =>
  $.tool.call({ tool: 'Write', file_path, content, tool_use_id: `w-${content}` })

test('toasts the variables an edit reads that .env.example does not declare', async ($, on) => {
  const toasts = project(on, { 'package.json': '{}', '.env.example': EXAMPLE })

  await write($, `const a = process.env.DATABASE_URL\nconst b = process.env.STRIPE_KEY\nconst c = import.meta.env['VITE_FLAG']`)
  expect(toasts).toEqual(['env: STRIPE_KEY, VITE_FLAG missing from .env.example'])
})

test('reports a name once and only when the edit adds it', async ($, on) => {
  const toasts = project(on, { 'package.json': '{}', '.env.example': EXAMPLE })

  await write($, `const b = process.env.STRIPE_KEY`)
  await write($, `const b = process.env.STRIPE_KEY // again`)
  await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/pay.ts',
    old_string: 'const a = process.env.OLD_KEY',
    new_string: 'const a = process.env.OLD_KEY // kept',
    tool_use_id: 'e1',
  })
  expect(toasts).toEqual(['env: STRIPE_KEY missing from .env.example'])
})

test('falls back to .env keys and ignores values, declared, provided and non-source files', async ($, on) => {
  const toasts = project(on, { 'package.json': '{}', '.env': 'SECRET_TOKEN=abc123\nPORT=3000\n' })

  await write($, `const a = process.env.SECRET_TOKEN + process.env.PORT + process.env.NODE_ENV + process.env.VERCEL_URL`)
  await write($, `process.env.NOPE`, '/work/README.md')
  expect(toasts).toEqual([])

  await write($, `const a = process.env.OTHER`)
  expect(toasts).toEqual(['env: OTHER missing from .env'])
  expect(toasts.join()).not.toContain('abc123')
})

test('does nothing without an env file or a package.json', async ($, on) => {
  const none = project(on, { 'package.json': '{}' })
  await write($, `const b = process.env.STRIPE_KEY`)
  expect(none).toEqual([])
})

test('does nothing outside a JavaScript project', async ($, on) => {
  const toasts = project(on, { '.env.example': EXAMPLE })
  await write($, `const b = process.env.STRIPE_KEY`)
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = project(on, { 'package.json': '{}', '.env.example': EXAMPLE })
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await write($, `const b = process.env.STRIPE_KEY`)
  expect(toasts).toEqual(['env: STRIPE_KEY sem declaração em .env.example'])
})
