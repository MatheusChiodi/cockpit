import { expect, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'killport',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

// Stands in for the person at the AskUserQuestion dialog that $.ui.ask opens.
const answer = (on: any, label: string) =>
  on('tool.call', { tool: 'AskUserQuestion' }, (_: unknown, e: any) => ({
    result: { questions: e.questions, answers: { [e.questions[0].question]: label } },
  }))

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

const NETSTAT = [
  '  Proto  Local Address          Foreign Address        State           PID',
  '  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       4812',
  '  TCP    0.0.0.0:30000          0.0.0.0:0              LISTENING       999',
  '  TCP    127.0.0.1:3000         127.0.0.1:51000        ESTABLISHED     777',
].join('\r\n')

// Answers the host tools of one OS and records the calls that are not lookups.
const host = (on: any, os: string | undefined, calls: string[], listing = '') => {
  on('env.get', () => ({ value: os }))
  on('process.run', (_: unknown, e: { argv: string[] }) => {
    const [tool = ''] = e.argv
    const line = e.argv.join(' ')

    if (tool === 'netstat') return done(0, NETSTAT)
    if (tool === 'tasklist') return done(0, '"node.exe","4812","Console","1","52,000 K"\r\n')
    if (tool === 'lsof') return done(listing === '' ? 1 : 0, listing)
    if (tool === 'ps') return done(0, 'node\n')
    calls.push(line)

    return done(0)
  })
}

test('names the process on Windows and ends it once confirmed', async ($, on) => {
  const calls: string[] = []
  host(on, 'Windows_NT', calls)
  answer(on, 'yes')

  expect((await $.command.run(run('3000'))).text).toBe('Ended node.exe (pid 4812).')
  expect(calls).toEqual(['taskkill /PID 4812 /F'])
})

test('finds the listener with lsof elsewhere', async ($, on) => {
  const calls: string[] = []
  host(on, undefined, calls, '5150\n')
  answer(on, 'yes')

  expect((await $.command.run(run('3000'))).text).toBe('Ended node (pid 5150).')
  expect(calls).toEqual(['kill 5150'])
})

test('ends nothing when the person says no', async ($, on) => {
  const calls: string[] = []
  host(on, 'Windows_NT', calls)
  answer(on, 'no')

  expect((await $.command.run(run('3000'))).text).toBe('Cancelled.')
  expect(calls).toEqual([])
})

test('ends nothing when the question is dismissed', async ($, on) => {
  const calls: string[] = []
  host(on, 'Windows_NT', calls)
  on('tool.call', { tool: 'AskUserQuestion' }, () => ({ deny: 'dismissed' }))

  expect((await $.command.run(run('3000'))).text).toBe('Cancelled.')
  expect(calls).toEqual([])
})

test('says when nothing listens, and matches the port exactly', async ($, on) => {
  host(on, 'Windows_NT', [])

  expect((await $.command.run(run('300'))).text).toBe('Nothing is listening on port 300.')
})

test('refuses a bad port without touching the host', async ($, on) => {
  const calls: string[] = []
  host(on, 'Windows_NT', calls)

  for (const typed of ['', 'abc', '0', '70000', '3000; calc', '-1']) {
    expect((await $.command.run(run(typed))).text, typed).toContain('Usage: /killport')
  }
})

test('speaks the language set in the hub', async ($, on) => {
  host(on, 'Windows_NT', [])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run('300'))).text).toBe('Nada escuta na porta 300.')
})
