import { expect, mock, test } from 'claude-code/testing'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const
const MIN = 60000

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

const world = (on: any, gh: { exitCode: number; stdout: string }, off: string[] = [], lang = 'en') => {
  const clock = mock.clock(on)
  const status: (string | undefined)[] = []
  const toasts: string[] = []
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('process.run', () => done(gh.exitCode, gh.stdout))
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: off, version: 1 } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return { clock, status, toasts }
}

const prs = (...numbers: number[]) => JSON.stringify(numbers.map(number => ({ number, title: `Title ${number}` })))

const started = async ($: any, clock: { advance: (ms: number) => Promise<void> }) => {
  await $.session.start(START)
  await clock.advance(1)
}

test('shows how many reviews wait, and toasts only for a new request', async ($, on) => {
  const gh = { exitCode: 0, stdout: prs(118, 120) }
  const { clock, status, toasts } = world(on, gh)

  await started($, clock)
  expect(status.at(-1)).toBe('reviews 2 · #118 Title 118')
  expect(toasts).toEqual([])

  gh.stdout = prs(118, 120, 131)
  await clock.advance(5 * MIN)
  expect(status.at(-1)).toBe('reviews 3 · #118 Title 118')
  expect(toasts).toEqual(['Review requested on #131: Title 131'])

  await clock.advance(5 * MIN)
  expect(toasts).toHaveLength(1)
})

test('hides the entry when nothing waits', async ($, on) => {
  const { clock, status } = world(on, { exitCode: 0, stdout: '[]' })

  await started($, clock)
  expect(status.at(-1)).toBeUndefined()
})

test('stays silent without gh or a signed-in session', async ($, on) => {
  const { clock, status, toasts } = world(on, { exitCode: 1, stdout: '' })

  await started($, clock)
  expect(status.every(text => text === undefined)).toBe(true)
  expect(toasts).toEqual([])
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const { clock, status } = world(on, { exitCode: 0, stdout: prs(1) }, ['review-queue'])

  await started($, clock)
  expect(status.length).toBeGreaterThan(0)
  expect(status.every(text => text === undefined)).toBe(true)
})

test('speaks the language set in the hub', async ($, on) => {
  const { clock, status } = world(on, { exitCode: 0, stdout: prs(7) }, [], 'pt')

  await started($, clock)
  expect(status.at(-1)).toBe('revisões 1 · #7 Title 7')
})

test('cuts a long title to 40 characters in the entry and the toast', async ($, on) => {
  const long = 'Refactor the payment gateway adapter for the new provider API'
  const gh = { exitCode: 0, stdout: '[]' }
  const { clock, status, toasts } = world(on, gh)

  await started($, clock)
  gh.stdout = JSON.stringify([{ number: 9, title: long }])
  await clock.advance(5 * MIN)

  const cut = `${long.slice(0, 39)}…`
  expect(status.at(-1)).toBe(`reviews 1 · #9 ${cut}`)
  expect(toasts).toEqual([`Review requested on #9: ${cut}`])
})

test('stays silent on output that is not JSON, and skips entries without a number', async ($, on) => {
  const gh = { exitCode: 0, stdout: 'not json' }
  const { clock, status } = world(on, gh)

  await started($, clock)
  expect(status.every(text => text === undefined)).toBe(true)

  gh.stdout = JSON.stringify([{ title: 'no number' }, { number: 4, title: 'Kept' }])
  await clock.advance(5 * MIN)
  expect(status.at(-1)).toBe('reviews 1 · #4 Kept')
})

test('the first successful look never toasts, even after gh failed', async ($, on) => {
  const gh = { exitCode: 1, stdout: '' }
  const { clock, status, toasts } = world(on, gh)

  await started($, clock)
  gh.exitCode = 0
  gh.stdout = prs(5, 6)
  await clock.advance(5 * MIN)
  expect(status.at(-1)).toBe('reviews 2 · #5 Title 5')
  expect(toasts).toEqual([])
})

test('asks gh for the open pull requests waiting on the person', async ($, on) => {
  const argvs: string[] = []
  const clock = mock.clock(on)
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('ui.status', () => ({ value: undefined }))
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    argvs.push(e.argv.join(' '))

    return done(0, '[]')
  })

  await started($, clock)
  expect(argvs).toEqual(['gh search prs --review-requested=@me --state=open --json number,title --limit 30'])
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const gh = { exitCode: 0, stdout: '[]' }
  const { clock, status, toasts } = world(on, gh, [], 'es')

  await started($, clock)
  gh.stdout = prs(12)
  await clock.advance(5 * MIN)
  expect(status.at(-1)).toBe('revisiones 1 · #12 Title 12')
  expect(toasts).toEqual(['Revisión pedida en #12: Title 12'])
})
