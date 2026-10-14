import { expect, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'gb',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})
const ok = (stdout = '') => done(0, stdout)
const fail = (stderr = '') => done(1, '', stderr)

test('lists the branches with the current one marked', async ($, on) => {
  on('process.run', () => ok('  dev\n* main\n  feat/x\n'))

  const answer = await $.command.run(run(''))
  expect(answer.text).toBe('  dev\n● main\n  feat/x')
})

test('switches to an existing branch', async ($, on) => {
  const calls: string[] = []
  on('process.run', (_, e) => {
    calls.push(e.argv.slice(2).join(' '))

    return ok()
  })

  const answer = await $.command.run(run('dev'))
  expect(answer.text).toBe('Switched to dev.')
  expect(calls).toEqual(['rev-parse --verify --quiet refs/heads/dev', 'switch dev'])
})

test('creates the branch when it does not exist', async ($, on) => {
  const calls: string[] = []
  on('process.run', (_, e) => {
    const args = e.argv.slice(2).join(' ')
    calls.push(args)

    return args.startsWith('rev-parse') ? fail() : ok()
  })

  const answer = await $.command.run(run('feat/new'))
  expect(answer.text).toBe('Created and switched to feat/new.')
  expect(calls[1]).toBe('switch -c feat/new')
})

test('refuses a name that could be an option', async ($, on) => {
  let ran = 0
  on('process.run', () => {
    ran += 1

    return ok()
  })

  const answer = await $.command.run(run('--force'))
  expect(answer.text).toContain('Usage: /gb')
  expect(ran).toBe(0)
})

test('speaks the language set in the hub', async ($, on) => {
  on('process.run', () => ok('* main\n'))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.command.run(run('--x'))
  expect(answer.text).toContain('Uso: /gb')
})
