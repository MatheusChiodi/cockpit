import { expect, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const run = (command: string, args = '') => ({
  command,
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const ran = (exitCode: number, stdout: string, stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

test('gs, gl and gd run the matching git command', async ($, on) => {
  const argvs: string[] = []
  on('process.run', ($, e) => {
    argvs.push(e.argv.join(' '))

    return ran(0, `out of ${e.argv[2]}\n`)
  })

  expect((await $.command.run(run('gs'))).text).toBe('out of status')
  expect((await $.command.run(run('gl', '5'))).text).toBe('out of log')
  expect((await $.command.run(run('gd'))).text).toBe('out of diff')
  expect(argvs).toEqual([
    'git --no-pager status --short --branch',
    'git --no-pager log --oneline --decorate -5',
    'git --no-pager diff --stat HEAD',
  ])
})

test('gl falls back to 10 commits on a bad count', async ($, on) => {
  const argvs: string[] = []
  on('process.run', ($, e) => {
    argvs.push(e.argv.at(-1) ?? '')

    return ran(0, 'x')
  })

  for (const args of ['', 'abc', '0', '101', '-3']) {
    await $.command.run(run('gl', args))
  }

  expect(argvs).toEqual(['-10', '-10', '-10', '-10', '-10'])
})

test('shows stderr on failure and says so when git is missing or silent', async ($, on) => {
  let answer: ReturnType<typeof ran> | 'missing' = ran(128, '', 'fatal: not a git repository\n')
  on('process.run', () => {
    if (answer === 'missing') {
      throw new Error('spawn git ENOENT')
    }

    return answer
  })

  expect((await $.command.run(run('gs'))).text).toBe('fatal: not a git repository')

  answer = ran(0, '')
  expect((await $.command.run(run('gs'))).text).toBe('(no output)')

  answer = 'missing'
  expect((await $.command.run(run('gs'))).text).toBe('git not found or not responding.')
})

test('speaks the language set in the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  on('process.run', () => ran(0, ''))

  expect((await $.command.run(run('gd'))).text).toBe('(sem saída)')
})
