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
