import { expect, test } from 'claude-code/testing'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const
const SHELL = { result: { stdout: '', stderr: '', interrupted: false } }

const summary = (pct: number) => JSON.stringify({ total: { lines: { pct }, statements: { pct: 1 } } })

// The project's files by path ending; the status line texts the mod sent.
const project = (on: any, files: () => Record<string, string>) => {
  const statuses: (string | undefined)[] = []
  const fileOf = (path: string) => Object.keys(files()).find(name => path.replaceAll('\\', '/').endsWith(name))

  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/repo' }))
  on('fs.exists', (_: unknown, e: { path: string }) => ({ value: fileOf(e.path) !== undefined }))
  on('fs.read', (_: unknown, e: { path: string }) => ({ value: files()[fileOf(e.path) ?? ''] ?? '' }))
  on('tool.call', { tool: 'Bash' }, () => SHELL)
  on('ui.status', (_: unknown, e: { text?: string }) => {
    statuses.push(e.text)

    return { value: undefined }
  })

  return statuses
}

test('shows the line coverage of the report and how far a test run moved it', async ($, on) => {
  let pct = 84
  const statuses = project(on, () => ({ 'coverage/coverage-summary.json': summary(pct) }))

  await $.session.start(START)
  expect(statuses.at(-1)).toBe('cov 84%')

  pct = 81.6
  await $.tool.call({ tool: 'Bash', command: 'npx vitest run --coverage', tool_use_id: 'b1' })
  expect(statuses.at(-1)).toBe('cov 82% ↓2')

  pct = 90
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'b2' })
  expect(statuses.at(-1)).toBe('cov 82% ↓2')

  await $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: 'b3' })
  expect(statuses.at(-1)).toBe('cov 90% ↑8')
})

test('reads a coverage.py report', async ($, on) => {
  const statuses = project(on, () => ({ 'coverage.json': JSON.stringify({ totals: { percent_covered: 61.2 } }) }))

  await $.session.start(START)
  expect(statuses.at(-1)).toBe('cov 61%')
})

test('hides when there is no report', async ($, on) => {
  const statuses = project(on, () => ({}))

  await $.session.start(START)
  expect(statuses).toEqual([undefined])
})

test('speaks the language set in the hub', async ($, on) => {
  const statuses = project(on, () => ({ 'coverage/coverage-summary.json': summary(70) }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  expect(statuses.at(-1)).toBe('cob 70%')
})
