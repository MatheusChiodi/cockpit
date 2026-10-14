import { expect, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'tree',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const dir = (name: string) => ({ name, kind: 'dir' as const, size: 0, mtimeMs: 0 })
const file = (name: string) => ({ name, kind: 'file' as const, size: 1, mtimeMs: 0 })

// A fake disk: the entries of each folder, keyed by the folder's path below /work.
const disk = (on: any, folders: Record<string, unknown[]>) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.list', (_: unknown, e: { path: string }) => {
    const key = e.path.replaceAll('\\', '/').replace(/^.*\/work\/?/, '')
    const entries = folders[key]

    return entries === undefined ? { deny: 'ENOENT' } : { value: entries }
  })
}

test('draws two levels, folders first, skipping noise', async ($, on) => {
  disk(on, {
    '': [file('package.json'), dir('node_modules'), dir('src'), dir('.git'), dir('dist'), dir('build'), dir('.github'), file('.env')],
    src: [file('index.ts'), dir('components')],
    'src/components': [file('deep.ts')],
  })

  expect((await $.command.run(run(''))).text).toBe(
    ['src/', '  components/', '  index.ts', '.env', 'package.json'].join('\n'),
  )
})

test('lists a subfolder given as the argument', async ($, on) => {
  disk(on, { src: [file('b.ts'), file('a.ts')] })

  expect((await $.command.run(run('src/'))).text).toBe('a.ts\nb.ts')
})

test('caps the output at 80 entries', async ($, on) => {
  disk(on, { '': Array.from({ length: 120 }, (_, i) => file(`f${String(i).padStart(3, '0')}.ts`)) })

  const lines = ((await $.command.run(run(''))).text ?? '').split('\n')
  expect(lines.length).toBe(81)
  expect(lines.at(-1)).toBe('… 40 more not shown')
})

test('says when the folder cannot be read or is empty', async ($, on) => {
  disk(on, { empty: [] })

  expect((await $.command.run(run('nope'))).text).toBe('Not a readable folder: nope')
  expect((await $.command.run(run('empty'))).text).toBe('Empty folder.')
})

test('speaks the language set in the hub', async ($, on) => {
  disk(on, {})
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await $.command.run(run('x'))).text).toBe('No es una carpeta legible: x')
})
