import { expect, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const run = (args = '') => ({
  command: 'who',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

const root = (on: any) => {
  on('session.root', () => ({ value: '/work' }))
  on('env.get', () => ({ value: undefined }))
}

const log = ['Ana\t3 days ago\ta1b2c3d\tfix: refresh token', 'Bob\t2 weeks ago\t9f8e7d6\tfeat: login', 'Ana\t1 month ago\t1234567\tinit'].join('\n')

test('shows the last author, the subject and the top authors', async ($, on) => {
  const argvs: string[] = []
  root(on)
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    argvs.push(e.argv.join(' '))

    return done(0, log)
  })

  expect((await $.command.run(run('src/login.ts'))).text).toBe(
    ['last     Ana  3 days ago  a1b2c3d', '         fix: refresh token', 'authors  Ana 2  Bob 1'].join('\n'),
  )
  expect(argvs[0]).toContain('-- src/login.ts')
})

test('asks for a path and refuses one outside the project', async ($, on) => {
  root(on)
  on('process.run', () => done(0, log))

  expect((await $.command.run(run())).text).toBe('Usage: /who <path>')
  expect((await $.command.run(run('../x'))).text).toBe('Outside the project: ../x')
})

test('says when no commit touches the path or git fails', async ($, on) => {
  let answer = done(0, '')
  root(on)
  on('process.run', () => answer)

  expect((await $.command.run(run('new.ts'))).text).toBe('No commits touch new.ts.')

  answer = done(128, '', 'fatal')
  expect((await $.command.run(run('new.ts'))).text).toBe('Not a git repository, or git is not responding.')
})

test('speaks the language set in the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  root(on)
  on('process.run', () => done(0, log))

  expect((await $.command.run(run('a.ts'))).text).toContain('último   Ana')
})

const argvOf = (on: any, stdout = log) => {
  const argvs: string[][] = []
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    argvs.push([...e.argv])

    return done(0, stdout)
  })

  return argvs
}

test('takes a quoted path and an absolute path inside the project', async ($, on) => {
  root(on)
  const argvs = argvOf(on)

  await $.command.run(run('"docs/my notes.md"'))
  expect(argvs[0]?.at(-1)).toBe('docs/my notes.md')

  await $.command.run(run('/work/src/./lib/../app.ts'))
  expect(argvs[1]?.at(-1)).toBe('src/app.ts')

  await $.command.run(run('.'))
  expect(argvs[2]?.at(-1)).toBe('.')
})

test('matches a Windows path without minding the case of the drive and folders', async ($, on) => {
  on('session.root', () => ({ value: 'C:\\Work\\App' }))
  on('env.get', () => ({ value: 'Windows_NT' }))
  const argvs = argvOf(on)

  await $.command.run(run('c:\\work\\app\\src\\a.ts'))
  expect(argvs[0]?.at(-1)).toBe('src/a.ts')
  expect((await $.command.run(run('D:\\other\\a.ts'))).text).toBe('Outside the project: D:\\other\\a.ts')
})

test('lists at most three authors, the busiest first', async ($, on) => {
  root(on)
  const many = ['Cid', 'Dee', 'Dee', 'Eve', 'Eve', 'Eve', 'Fay', 'Fay', 'Fay', 'Fay'].map(name => `${name}\tnow\tabc\tmsg`).join('\n')
  argvOf(on, many)

  const text = (await $.command.run(run('a.ts'))).text ?? ''
  expect(text.split('\n')[2]).toBe('authors  Fay 4  Eve 3  Dee 2')
  expect(text.split('\n')[0]).toBe('last     Cid  now  abc')
})

test('says git is not responding when it cannot start', async ($, on) => {
  root(on)
  on('process.run', () => ({ deny: 'spawn git ENOENT' }))

  expect((await $.command.run(run('a.ts'))).text).toBe('Not a git repository, or git is not responding.')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  root(on)
  on('process.run', () => done(0, ''))

  expect((await $.command.run(run())).text).toBe('Uso: /who <ruta>')
  expect((await $.command.run(run('../x'))).text).toBe('Fuera del proyecto: ../x')
  expect((await $.command.run(run('a.ts'))).text).toBe('Ningún commit modifica a.ts.')
})
