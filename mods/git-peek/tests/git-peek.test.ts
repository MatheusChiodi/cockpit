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

test('gl takes up to 100 and only whole numbers', async ($, on) => {
  const argvs: string[] = []
  on('process.run', (_, e) => {
    argvs.push(e.argv.at(-1) ?? '')

    return ran(0, 'x')
  })

  for (const args of ['100', ' 1 ', '2.5', '1e1']) {
    await $.command.run(run('gl', args))
  }

  expect(argvs).toEqual(['-100', '-1', '-10', '-10'])
})

test('cuts a long output at 8000 characters', async ($, on) => {
  on('process.run', () => ran(0, `${'a'.repeat(9000)}\n`))

  expect((await $.command.run(run('gd'))).text).toHaveLength(8000)
})

test('a failure with nothing on stderr says no output', async ($, on) => {
  on('process.run', () => ran(1, 'stdout is ignored on failure\n', ''))

  expect((await $.command.run(run('gl'))).text).toBe('(no output)')
})

test('registers the three commands with their descriptions', async ($, on) => {
  const registered: string[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => {
    registered.push(`${e.name}: ${e.description}`)

    return { value: { command: e.name } }
  })

  await $.session.start({ cwd: '/repo', surface: null, isInteractive: true })
  expect(registered).toEqual([
    'gs: Short git status, no turn spent',
    'gl: Latest commits (git log --oneline)',
    'gd: Summary of the current diff (git diff --stat)',
  ])
})

test('speaks Spanish when the hub says so', async ($, on) => {
  let missing = false
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  on('process.run', () => {
    if (missing) {
      throw new Error('spawn git ENOENT')
    }

    return ran(0, '')
  })

  expect((await $.command.run(run('gs'))).text).toBe('(sin salida)')
  missing = true
  expect((await $.command.run(run('gs'))).text).toBe('git no encontrado o sin respuesta.')
})
