import { expect, test } from 'claude-code/testing'

declare const setTimeout: (run: (value?: unknown) => void, ms: number) => unknown

// The status line is written unawaited by the mod: give it a moment to land.
const flush = () => new Promise(resolve => setTimeout(resolve, 30))

// The world beneath the mod: the hub, every shell command passing or failing as told, and the status line recorded.
const world = (on: any, off: string[] = [], lang = 'en') => {
  const status: (string | undefined)[] = []
  const outcome = { isError: false, isDenied: false }
  const answer = () =>
    outcome.isDenied
      ? { deny: 'blocked' }
      : outcome.isError
        ? { result: { stdout: 'boom', stderr: '', interrupted: false }, text: 'boom', isError: true as const }
        : { result: { stdout: 'ok', stderr: '', interrupted: false }, text: 'ok' }

  on('tool.call', { tool: 'Bash' }, answer)
  on('tool.call', { tool: 'PowerShell' }, answer)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: off, version: 1 } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })

  return { status, outcome }
}

const bash = async ($: any, command: string) => {
  const ran = await $.tool.call({ tool: 'Bash', command, tool_use_id: `b-${command}` })
  await flush()

  return ran
}

// Runs the three checks in order, so each test ends with all of them on the line whatever ran before.
const all = async ($: any, outcome: { isError: boolean }, results: [boolean, boolean, boolean]) => {
  const commands = ['npm run lint', 'npx tsc --noEmit', 'npm run build']

  for (const [index, command] of commands.entries()) {
    outcome.isError = !results[index]!
    await bash($, command)
  }
}

test('keeps the last result of lint, types and build on the line', async ($, on) => {
  const { status, outcome } = world(on)

  await all($, outcome, [true, false, true])
  expect(status.at(-1)).toBe('lint ✓ · types ✗ · build ✓')

  await all($, outcome, [true, true, true])
  expect(status.at(-1)).toBe('lint ✓ · types ✓ · build ✓')
})

test('a later run of one check updates only that check', async ($, on) => {
  const { status, outcome } = world(on)

  await all($, outcome, [true, true, true])
  outcome.isError = true
  await bash($, 'eslint src')
  expect(status.at(-1)).toBe('lint ✗ · types ✓ · build ✓')
})

test('recognises the tools of other stacks, in Bash and PowerShell', async ($, on) => {
  const { status, outcome } = world(on)

  await all($, outcome, [true, true, true])

  for (const [command, line] of [
    ['ruff check .', 'lint ✗ · types ✓ · build ✓'],
    ['mypy src', 'lint ✗ · types ✗ · build ✓'],
    ['cargo build', 'lint ✗ · types ✗ · build ✗'],
  ] as const) {
    outcome.isError = true
    await bash($, command)
    expect(status.at(-1), command).toBe(line)
  }

  outcome.isError = false
  await $.tool.call({ tool: 'PowerShell', command: 'pnpm lint', tool_use_id: 'p-1' })
  await flush()
  expect(status.at(-1)).toBe('lint ✓ · types ✗ · build ✗')
})

test('ignores commands that are not checks, and denied ones', async ($, on) => {
  const { status, outcome } = world(on)

  await all($, outcome, [true, true, true])
  const seen = status.length

  await bash($, 'ls -la')
  await bash($, 'git status')
  outcome.isDenied = true
  await bash($, 'npm run lint')
  expect(status.length).toBe(seen)
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const { status, outcome } = world(on, ['quality-status'])

  await all($, outcome, [true, true, true])
  expect(status.length).toBeGreaterThan(0)
  expect(status.every(text => text === undefined)).toBe(true)
})

test('speaks the language set in the hub', async ($, on) => {
  const { status, outcome } = world(on, [], 'pt')

  await all($, outcome, [true, false, true])
  expect(status.at(-1)).toBe('lint ✓ · tipos ✗ · build ✓')
})

test('shows only the checks that ran so far', async ($, on) => {
  const { status } = world(on)

  await bash($, 'npm run build')
  expect(status.at(-1)).toBe('build ✓')

  await bash($, 'pyright')
  expect(status.at(-1)).toBe('types ✓ · build ✓')
})

test('one command that runs several checks updates each of them', async ($, on) => {
  const { status, outcome } = world(on)

  outcome.isError = true
  await bash($, 'npm run lint && npm run typecheck && npm run build')
  expect(status.at(-1)).toBe('lint ✗ · types ✗ · build ✗')
})

test('recognises more lint, type and build commands', async ($, on) => {
  const { status } = world(on)

  for (const [command, line] of [
    ['biome check src', 'lint ✓'],
    ['yarn type-check', 'lint ✓ · types ✓'],
    ['mvn package -DskipTests', 'lint ✓ · types ✓ · build ✓'],
  ] as const) {
    await bash($, command)
    expect(status.at(-1), command).toBe(line)
  }

  const seen = status.length
  for (const command of ['npm test', 'npm run dev', 'vite']) {
    await bash($, command)
  }
  expect(status.length).toBe(seen)
})

test('speaks Spanish when the hub says so', async ($, on) => {
  const { status, outcome } = world(on, [], 'es')

  await all($, outcome, [false, true, true])
  expect(status.at(-1)).toBe('lint ✗ · tipos ✓ · build ✓')
})
