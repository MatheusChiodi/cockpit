import { expect, mock, test } from 'claude-code/testing'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

type Pr = { number?: number; state?: string; isDraft?: boolean; reviewDecision?: string }

// The world beneath the mod: a fake `gh pr view`, the hub, and the status line recorded.
const world = (on: any, gh: { exitCode: number; stdout: string }, off: string[] = [], lang = 'en') => {
  const clock = mock.clock(on)
  const status: (string | undefined)[] = []
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('process.run', () => done(gh.exitCode, gh.stdout))
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: off, version: 1 } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })

  return { clock, status }
}

const view = (pr: Pr, exitCode = 0) => ({ exitCode, stdout: JSON.stringify(pr) })

// The first refresh runs unawaited at session start: let it land.
const started = async ($: any, clock: { advance: (ms: number) => Promise<void> }) => {
  await $.session.start(START)
  await clock.advance(1)
}

test('shows the number and the review state of the pull request', async ($, on) => {
  const cases: [Pr, string][] = [
    [{ number: 12, state: 'OPEN', reviewDecision: 'APPROVED' }, 'pr #12 ✓ approved'],
    [{ number: 12, state: 'OPEN', reviewDecision: 'CHANGES_REQUESTED' }, 'pr #12 ✗ changes requested'],
    [{ number: 12, state: 'OPEN', reviewDecision: 'REVIEW_REQUIRED' }, 'pr #12 … awaiting review'],
    [{ number: 12, state: 'OPEN', reviewDecision: '' }, 'pr #12 open'],
    [{ number: 12, state: 'OPEN', isDraft: true }, 'pr #12 draft'],
    [{ number: 12, state: 'MERGED', reviewDecision: 'APPROVED' }, 'pr #12 ⇄ merged'],
    [{ number: 12, state: 'CLOSED' }, 'pr #12 closed'],
  ]
  const fake = view(cases[0]![0])
  const { clock, status } = world(on, fake)

  await started($, clock)

  for (const [pr, text] of cases) {
    fake.stdout = JSON.stringify(pr)
    await clock.advance(180000)
    expect(status.at(-1), text).toBe(text)
  }
})

test('shows nothing with no pull request on the branch or without gh', async ($, on) => {
  const fake = view({}, 1)
  const { clock, status } = world(on, fake)

  await started($, clock)
  expect(status.at(-1)).toBeUndefined()

  fake.exitCode = 0
  await clock.advance(180000)
  expect(status.at(-1)).toBeUndefined()

  fake.stdout = 'not json'
  await clock.advance(180000)
  expect(status.at(-1)).toBeUndefined()
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const { clock, status } = world(on, view({ number: 3, state: 'OPEN' }), ['pr-status'])

  await started($, clock)
  expect(status.length).toBeGreaterThan(0)
  expect(status.every(text => text === undefined)).toBe(true)
})

test('speaks the language set in the hub', async ($, on) => {
  const fake = view({ number: 7, state: 'OPEN', reviewDecision: 'APPROVED' })
  const { clock, status } = world(on, fake, [], 'pt')

  await started($, clock)
  expect(status.at(-1)).toBe('pr #7 ✓ aprovado')

  fake.stdout = JSON.stringify({ number: 7, state: 'OPEN', isDraft: true })
  await clock.advance(180000)
  expect(status.at(-1)).toBe('pr #7 rascunho')
})
