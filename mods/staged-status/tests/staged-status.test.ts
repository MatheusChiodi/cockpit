import { expect, mock, test } from 'claude-code/testing'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

const reply = (stdout: string, exitCode = 0) => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

test('counts staged, unstaged and new files and hides on a clean tree', async ($, on) => {
  const clock = mock.clock(on)
  const statuses: (string | undefined)[] = []
  let out = 'M  a.ts\nMM b.ts\n M c.ts\n?? d.ts\n?? e.ts\n'
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () => reply(out))
  on('ui.status', (_, e) => {
    statuses.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)
  expect(statuses.at(-1)).toBe('index 2 staged  2 unstaged  2 new')

  out = ''
  await clock.advance(30000)
  expect(statuses.at(-1)).toBeUndefined()
})

test('hides outside a repository and speaks the hub language', async ($, on) => {
  const clock = mock.clock(on)
  const statuses: (string | undefined)[] = []
  let out = reply('A  a.ts\n')
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () => out)
  on('ui.status', (_, e) => {
    statuses.push(e.text)

    return { value: undefined }
  })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  expect(statuses.at(-1)).toBe('index 1 no stage')

  out = reply('', 128)
  await clock.advance(30000)
  expect(statuses.at(-1)).toBeUndefined()
})

// Records every status line text the mod sends.
const recorder = (on: any) => {
  const statuses: (string | undefined)[] = []
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    statuses.push(e.text)

    return { value: undefined }
  })

  return statuses
}

test('counts only new files when nothing else changed, and refreshes at the end of a turn', async ($, on) => {
  mock.clock(on)
  const statuses = recorder(on)
  let out = '?? notes.md\n'
  on('process.run', () => reply(out))
  on('turn.complete', (_, e) => ({ text: e.answer }))

  await $.session.start(START)
  expect(statuses.at(-1)).toBe('index 1 new')

  out = 'D  gone.ts\nR  old.ts -> new.ts\n'
  await $.turn.complete({ answer: '', durationMs: 10, isAborted: false, turnId: 't1', reason: 'answer' })
  expect(statuses.at(-1)).toBe('index 2 staged')
})

test('hides when git cannot start', async ($, on) => {
  mock.clock(on)
  const statuses = recorder(on)
  on('process.run', () => {
    throw new Error('spawn git ENOENT')
  })

  await $.session.start(START)
  expect(statuses).toEqual([undefined])
})

test('speaks Spanish when the hub says so', async ($, on) => {
  mock.clock(on)
  const statuses = recorder(on)
  on('process.run', () => reply('MM a.ts\n?? b.ts\n'))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.start(START)
  expect(statuses.at(-1)).toBe('index 1 en stage  1 fuera  1 nuevos')
})

test('stays hidden while the hub lists it as off', async ($, on) => {
  const clock = mock.clock(on)
  const statuses = recorder(on)
  on('process.run', () => reply('M  a.ts\n'))
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['staged-status'], version: 1 } }))

  await $.session.start(START)
  await clock.advance(30000)
  expect(statuses.length).toBeGreaterThan(0)
  expect(statuses.every(text => text === undefined)).toBe(true)
})

// Stands in for the hub: a /flip command that writes its own `off` list, as the settings pane does.
const HUB = {
  name: 'cockpit',
  register: (on: any) => {
    on('command.run', { command: 'flip' }, async ($: any, e: any) => {
      await $.state.set({ plugin: 'cockpit', key: 'off' }, e.args === 'off' ? ['staged-status'] : [])

      return { text: 'flipped' }
    })
  },
}

test('clears the entry when the hub turns it off', { plugins: [HUB] }, async ($, on) => {
  const clock = mock.clock(on)
  const statuses = recorder(on)
  on('process.run', () => reply('M  a.ts\n'))

  await $.session.start(START)
  expect(statuses.at(-1)).toBe('index 1 staged')

  await $.command.run({ command: 'flip', args: 'off', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect(statuses.at(-1)).toBeUndefined()

  await clock.advance(30000)
  expect(statuses.at(-1)).toBeUndefined()
})
