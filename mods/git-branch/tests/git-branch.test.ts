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

test('reports what git said when the switch fails', async ($, on) => {
  on('process.run', (_, e) =>
    e.argv[2] === 'switch' ? fail('error: Your local changes would be overwritten by checkout:\n\tsrc/a.ts') : ok(),
  )

  expect((await $.command.run(run('dev'))).text).toBe('git refused: error: Your local changes would be overwritten by checkout:')
})

test('says git is missing when the process cannot start or the list fails', async ($, on) => {
  let throws = true
  on('process.run', () => {
    if (throws) {
      throw new Error('spawn git ENOENT')
    }

    return done(128, '', 'not a git repository')
  })

  expect((await $.command.run(run(''))).text).toBe('git not found or not a repository.')
  expect((await $.command.run(run('dev'))).text).toBe('git not found or not a repository.')
  throws = false
  expect((await $.command.run(run(''))).text).toBe('git not found or not a repository.')
})

test('says when there are no local branches', async ($, on) => {
  on('process.run', () => ok('\n'))

  expect((await $.command.run(run(''))).text).toBe('No local branches.')
})

test('refuses names with spaces or shell characters', async ($, on) => {
  let ran = 0
  on('process.run', () => {
    ran += 1

    return ok()
  })

  for (const name of ['two words', 'a;rm', '.hidden', 'x$y']) {
    expect((await $.command.run(run(name))).text, name).toContain('Usage: /gb')
  }

  expect(ran).toBe(0)
})

test('speaks Spanish from the hub', async ($, on) => {
  on('process.run', (_, e) => (e.argv[2] === 'rev-parse' ? fail() : ok()))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await $.command.run(run('feat/y'))).text).toBe('Creó y cambió a feat/y.')
})

test('the Portuguese switch message', async ($, on) => {
  on('process.run', () => ok())
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run('dev'))).text).toBe('Trocou para dev.')
})
