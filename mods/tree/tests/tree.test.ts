import { expect, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'tree',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const dir = (name: string) => ({ name, kind: 'dir' as const, size: 0, mtimeMs: 0, isLink: false })
const file = (name: string) => ({ name, kind: 'file' as const, size: 1, mtimeMs: 0, isLink: false })

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

test('takes an absolute or quoted folder as it is given', async ($, on) => {
  const asked: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.list', (_: unknown, e: { path: string }) => {
    asked.push(e.path.replaceAll('\\', '/'))

    return { value: [file('x.ts')] }
  })

  expect((await $.command.run(run('/elsewhere/lib'))).text).toBe('x.ts')
  expect((await $.command.run(run('"my folder"'))).text).toBe('x.ts')
  expect((await $.command.run(run('C:\\data\\'))).text).toBe('x.ts')
  // The engine resolves a rooted path on the session's drive.
  expect(asked.map(path => path.replace(/^[A-Z]:(?=\/(?:elsewhere|work)\/)/, ''))).toEqual(['/elsewhere/lib', '/work/my folder', 'C:/data'])
})

test('a subfolder it cannot read is listed without children, and the third level never shows', async ($, on) => {
  disk(on, {
    '': [dir('locked'), dir('src')],
    src: [dir('deep')],
    'src/deep': [file('hidden.ts')],
  })

  expect((await $.command.run(run(''))).text).toBe(['locked/', 'src/', '  deep/'].join('\n'))
})

test('stops opening folders once the cap is reached', async ($, on) => {
  disk(on, {
    '': [...Array.from({ length: 79 }, (_, i) => dir(`d${String(i).padStart(2, '0')}`)), dir('zz')],
    ...Object.fromEntries(Array.from({ length: 79 }, (_, i) => [`d${String(i).padStart(2, '0')}`, []])),
    d00: [file('a.ts')],
    zz: [file('never.ts')],
  })

  const text = (await $.command.run(run(''))).text ?? ''
  expect(text).toContain('  a.ts')
  expect(text).not.toContain('never.ts')
  expect(text.split('\n').at(-1)).toBe('… 1 more not shown')
})

test('speaks Portuguese when the hub says so', async ($, on) => {
  disk(on, { vazia: [dir('.cache')] })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run('x'))).text).toBe('Não é uma pasta legível: x')
  expect((await $.command.run(run('vazia'))).text).toBe('Pasta vazia.')
})
