import { expect, mock, test } from 'claude-code/testing'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

type Run = { status?: string; conclusion?: string | null; workflowName?: string; headBranch?: string }

const BUILD: Run = { status: 'completed', conclusion: 'success', workflowName: 'build', headBranch: 'main' }

// The world beneath the mod: a fake `gh run list`, the hub, and the status line recorded.
const world = (on: any, gh: { exitCode: number; stdout: string; calls: number }, off: string[] = [], lang = 'en') => {
  const clock = mock.clock(on)
  const status: (string | undefined)[] = []
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('process.run', () => {
    gh.calls += 1

    return done(gh.exitCode, gh.stdout)
  })
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: off, version: 1 } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })

  return { clock, status }
}

const gh = (run?: Run, exitCode = 0) => ({ exitCode, stdout: JSON.stringify(run === undefined ? [] : [run]), calls: 0 })

// The first refresh runs unawaited at session start: let it land.
const started = async ($: any, clock: { advance: (ms: number) => Promise<void> }) => {
  await $.session.start(START)
  await clock.advance(1)
}

test('shows a passing run with its workflow and branch', async ($, on) => {
  const { clock, status } = world(on, gh(BUILD))

  await started($, clock)
  expect(status.at(-1)).toBe('ci ✓ build · main')
})

test('shows a failed run with its conclusion, and a run in progress', async ($, on) => {
  const fake = gh({ ...BUILD, conclusion: 'failure' })
  const { clock, status } = world(on, fake)

  await started($, clock)
  expect(status.at(-1)).toBe('ci ✗ failure build · main')

  fake.stdout = JSON.stringify([{ status: 'in_progress', conclusion: null, workflowName: 'deploy', headBranch: 'dev' }])
  await clock.advance(120000)
  expect(status.at(-1)).toBe('ci … running deploy · dev')
})

test('polls every two minutes and checks again 15 seconds after a push', async ($, on) => {
  const fake = gh(BUILD)
  const { clock } = world(on, fake)
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }))

  await started($, clock)
  expect(fake.calls).toBe(1)

  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'b-1' })
  await clock.advance(15000)
  expect(fake.calls).toBe(1)

  await $.tool.call({ tool: 'Bash', command: 'git push origin main', tool_use_id: 'b-2' })
  await clock.advance(15000)
  expect(fake.calls).toBe(2)

  await clock.advance(120000)
  expect(fake.calls).toBeGreaterThanOrEqual(3)
})

test('shows nothing without gh, outside a GitHub repository or with no runs', async ($, on) => {
  const fake = gh(undefined, 1)
  const { clock, status } = world(on, fake)

  await started($, clock)
  expect(status.at(-1)).toBeUndefined()

  fake.exitCode = 0
  await clock.advance(120000)
  expect(status.at(-1)).toBeUndefined()

  fake.stdout = 'not json'
  await clock.advance(120000)
  expect(status.at(-1)).toBeUndefined()
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const { clock, status } = world(on, gh(BUILD), ['ci-status'])

  await started($, clock)
  expect(status.length).toBeGreaterThan(0)
  expect(status.every(text => text === undefined)).toBe(true)
})

test('speaks the language set in the hub', async ($, on) => {
  const fake = gh({ status: 'queued', workflowName: 'build', headBranch: 'main' })
  const { clock, status } = world(on, fake, [], 'pt')

  await started($, clock)
  expect(status.at(-1)).toBe('ci … rodando build · main')

  fake.stdout = JSON.stringify([{ status: 'completed', conclusion: null, workflowName: 'build', headBranch: 'main' }])
  await clock.advance(120000)
  expect(status.at(-1)).toBe('ci ✗ falhou build · main')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const fake = gh({ status: 'in_progress', workflowName: 'build', headBranch: 'main' })
  const { clock, status } = world(on, fake, [], 'es')

  await started($, clock)
  expect(status.at(-1)).toBe('ci … en curso build · main')

  fake.stdout = JSON.stringify([{ status: 'completed', conclusion: null, workflowName: 'build', headBranch: 'main' }])
  await clock.advance(120000)
  expect(status.at(-1)).toBe('ci ✗ falló build · main')
})

test('fills in a missing workflow name and branch', async ($, on) => {
  const { clock, status } = world(on, gh({ status: 'completed', conclusion: 'success' }))

  await started($, clock)
  expect(status.at(-1)).toBe('ci ✓ workflow · ?')
})

test('shows nothing when gh cannot start', async ($, on) => {
  const clock = mock.clock(on)
  const status: (string | undefined)[] = []
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('process.run', () => {
    throw new Error('spawn gh ENOENT')
  })
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })

  await started($, clock)
  expect(status.length).toBeGreaterThan(0)
  expect(status.every(text => text === undefined)).toBe(true)
})

test('a push through PowerShell also checks again', async ($, on) => {
  const fake = gh(BUILD)
  const { clock } = world(on, fake)
  on('tool.call', { tool: 'PowerShell' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }) as never)

  await started($, clock)
  await $.tool.call({ tool: 'PowerShell', command: 'git push', tool_use_id: 'p-1' })
  await clock.advance(15000)
  expect(fake.calls).toBe(2)
})

// Stands in for the hub: a /flip command that writes its own `off` list, as the settings pane does.
const HUB = {
  name: 'cockpit',
  register: (on: any) => {
    on('command.run', { command: 'flip' }, async ($: any, e: any) => {
      await $.state.set({ plugin: 'cockpit', key: 'off' }, e.args === 'off' ? ['ci-status'] : [])

      return { text: 'flipped' }
    })
  },
}

test('clears the entry when the hub turns it off', { plugins: [HUB] }, async ($, on) => {
  const clock = mock.clock(on)
  const status: (string | undefined)[] = []
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('process.run', () => done(0, JSON.stringify([BUILD])))
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })

  await started($, clock)
  expect(status.at(-1)).toBe('ci ✓ build · main')

  await $.command.run({ command: 'flip', args: 'off', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect(status.at(-1)).toBeUndefined()

  await clock.advance(120000)
  expect(status.at(-1)).toBeUndefined()
})
