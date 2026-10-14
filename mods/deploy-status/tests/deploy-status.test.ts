import { expect, mock, test } from 'claude-code/testing'

declare const setTimeout: (run: () => void, ms: number) => unknown

// The status line is written unawaited by the mod: give it a moment to land.
const flush = () => new Promise(resolve => setTimeout(() => resolve(undefined), 30))

// The world beneath the mod: the hub's switch and language, a clock the command can spend, and the status line recorded.
const world = (on: any, off: string[] = [], lang = 'en') => {
  const clock = mock.clock(on)
  const status: (string | undefined)[] = []
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: off, version: 1 } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })

  return { clock, status }
}

// A shell command that takes `ms` and then passes or fails.
const shell = (on: any, clock: { advance: (ms: number) => Promise<void> }, ms: number, isError = false) => {
  const answer = async () => {
    await clock.advance(ms)

    return isError
      ? { result: { stdout: 'boom', stderr: '', interrupted: false }, text: 'boom', isError: true as const }
      : { result: { stdout: 'ok', stderr: '', interrupted: false }, text: 'ok' }
  }

  on('tool.call', { tool: 'Bash' }, answer)
  on('tool.call', { tool: 'PowerShell' }, answer)
}

const bash = async ($: any, command: string) => {
  const ran = await $.tool.call({ tool: 'Bash', command, tool_use_id: `b-${command}` })
  await flush()

  return ran
}

const TIME = String.raw`\d{1,2}:\d{2}(\s?[AP]M)?`

test('shows the deploy in progress and then the result with target, time and duration', async ($, on) => {
  const { clock, status } = world(on)
  shell(on, clock, 48000)

  await bash($, 'vercel deploy --prod')
  expect(status[0]).toBe('deploy vercel …')
  expect(status.at(-1)).toMatch(new RegExp(`^deploy ✓ vercel ${TIME} · 48s$`))
})

test('marks a failed deploy', async ($, on) => {
  const { clock, status } = world(on)
  shell(on, clock, 250, true)

  await bash($, 'firebase deploy --only hosting')
  expect(status.at(-1)).toMatch(new RegExp(`^deploy ✗ firebase ${TIME} · 250ms$`))
})

test('recognises deploy commands in PowerShell and ignores other commands', async ($, on) => {
  const { clock, status } = world(on)
  shell(on, clock, 10)

  for (const command of ['npm run build', 'git push origin main', 'vercel dev', 'ls']) {
    await bash($, command)
  }

  expect(status).toEqual([])

  await $.tool.call({ tool: 'PowerShell', command: 'eas build --platform android', tool_use_id: 'p-1' })
  await flush()
  expect(status.at(-1)).toMatch(/^deploy ✓ eas/)

  for (const [command, target] of [
    ['netlify deploy --prod', 'netlify'],
    ['fly deploy', 'fly'],
    ['pnpm deploy', 'pnpm'],
    ['git push heroku main', 'heroku'],
    ['terraform apply -auto-approve', 'terraform'],
  ] as const) {
    status.length = 0
    await bash($, command)
    expect(status[0], command).toBe(`deploy ${target} …`)
  }
})

test('a denied deploy leaves the line at the running mark', async ($, on) => {
  const { status } = world(on)
  on('tool.call', { tool: 'Bash' }, () => ({ deny: 'blocked' }))

  await bash($, 'vercel deploy')
  expect(status).toEqual(['deploy vercel …'])
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const { clock, status } = world(on, ['deploy-status'])
  shell(on, clock, 100)

  await bash($, 'vercel deploy')
  expect(status.length).toBeGreaterThan(0)
  expect(status.every(text => text === undefined)).toBe(true)
})

test('speaks the language set in the hub', async ($, on) => {
  const { clock, status } = world(on, [], 'pt')
  shell(on, clock, 1200)

  await bash($, 'vercel deploy')
  expect(status[0]).toBe('deploy vercel …')
  expect(status.at(-1)).toMatch(new RegExp(`^deploy ✓ vercel ${TIME} · 1s$`))
})
