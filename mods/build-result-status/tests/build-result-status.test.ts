import { expect, mock, test } from 'claude-code/testing'

declare const setTimeout: (run: (value?: unknown) => void, ms: number) => unknown

// The status line is written unawaited by the engine: give it a moment to land.
const flush = () => new Promise(resolve => setTimeout(resolve, 30))

const fileOf = (path: string) => path.replaceAll('\\', '/').split('/').pop() ?? ''

// A project with build `files`, a clock the command can spend, and the status line recorded.
const world = (on: any, files: Record<string, string>, lang = 'en') => {
  const clock = mock.clock(on)
  const status: (string | undefined)[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) => (fileOf(e.path) in files ? { value: files[fileOf(e.path)] } : { deny: 'ENOENT' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })

  return { clock, status }
}

// A shell command that takes `ms` and prints `text`.
const shell = (on: any, clock: { advance: (ms: number) => Promise<void> }, ms: number, text: string, isError = false) => {
  const answer = async () => {
    await clock.advance(ms)

    return isError
      ? { result: { stdout: text, stderr: '', interrupted: false }, text, isError: true as const }
      : { result: { stdout: text, stderr: '', interrupted: false }, text }
  }

  on('tool.call', { tool: 'Bash' }, answer)
  on('tool.call', { tool: 'PowerShell' }, answer)
}

let counter = 0

const bash = async ($: any, command: string) => {
  counter += 1
  const ran = await $.tool.call({ tool: 'Bash', command, tool_use_id: `b-${counter}` })
  await flush()

  return ran
}

const POM = { 'pom.xml': '<project/>' }
const TIME = String.raw`\d{1,2}:\d{2}(\s?[AP]M)?`

const MAVEN_FAIL = `[INFO] Tests run: 12, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 1 s - in a.A
[ERROR] Tests run: 41, Failures: 1, Errors: 1, Skipped: 0
[INFO] BUILD FAILURE
`

test('shows a Maven run with its time, tests and failures', async ($, on) => {
  const { clock, status } = world(on, POM)
  shell(on, clock, 8400, MAVEN_FAIL, true)

  await bash($, './mvnw clean verify')
  expect(status[0]).toBe('mvn …')
  expect(status.at(-1)).toMatch(new RegExp(`^mvn ✗ ${TIME} · 8\\.4s · 41 tests · 2 failed$`))
})

test('shows a passing Maven run without a failure count', async ($, on) => {
  const { clock, status } = world(on, POM)
  shell(on, clock, 3100, '[INFO] Tests run: 7, Failures: 0, Errors: 0, Skipped: 1\n[INFO] BUILD SUCCESS\n')

  await bash($, 'mvn -q test')
  expect(status.at(-1)).toMatch(new RegExp(`^mvn ✓ ${TIME} · 3\\.1s · 7 tests$`))
})

test('reads Gradle output and names the tool without the w', async ($, on) => {
  const { clock, status } = world(on, { 'build.gradle.kts': '' })
  shell(on, clock, 250, '12 tests completed, 3 failed\nBUILD FAILED in 2s\n', true)

  await bash($, './gradlew test')
  expect(status.at(-1)).toMatch(new RegExp(`^gradle ✗ ${TIME} · 250ms · 12 tests · 3 failed$`))
})

test('falls back to the exit state when the output names no verdict', async ($, on) => {
  const { clock, status } = world(on, POM)
  shell(on, clock, 50, 'boom', true)

  await bash($, 'mvn package')
  expect(status.at(-1)).toMatch(new RegExp(`^mvn ✗ ${TIME} · 50ms$`))
})

test('ignores other commands and a mvn with no build goal', async ($, on) => {
  const { clock, status } = world(on, POM)
  shell(on, clock, 10, 'ok')

  for (const command of ['ls -la', 'npm test', 'mvn -v', 'mvn dependency:tree', 'echo mvn test']) {
    await bash($, command)
  }

  expect(status).toEqual([])
})

test('does nothing without a Java build file', async ($, on) => {
  const { clock, status } = world(on, { 'package.json': '{}' })
  shell(on, clock, 10, '[INFO] BUILD SUCCESS')

  await bash($, 'mvn test')
  expect(status).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const { clock, status } = world(on, POM, 'pt')
  shell(on, clock, 1000, '[ERROR] Tests run: 5, Failures: 1, Errors: 0, Skipped: 0\n[INFO] BUILD FAILURE\n', true)

  await bash($, 'mvn test')
  expect(status.at(-1)).toMatch(new RegExp(`^mvn ✗ ${TIME} · 1\\.0s · 5 testes · 1 falha$`))
})

test('watches gradlew.bat build in PowerShell', async ($, on) => {
  const { clock, status } = world(on, { 'build.gradle': '' })
  shell(on, clock, 2000, 'BUILD SUCCESSFUL in 2s\n')

  await $.tool.call({ tool: 'PowerShell', command: '.\\gradlew.bat build', tool_use_id: 'p1' })
  await flush()
  expect(status[0]).toBe('gradle …')
  expect(status.at(-1)).toMatch(new RegExp(`^gradle ✓ ${TIME} · 2\.0s$`))
})

test('finds the build in a chained command with env assignments', async ($, on) => {
  const { clock, status } = world(on, POM)
  shell(on, clock, 100, '[INFO] BUILD SUCCESS\n')

  await bash($, 'cd api && JAVA_HOME=/opt/jdk mvn -B install')
  expect(status.at(-1)).toMatch(new RegExp(`^mvn ✓ ${TIME} · 100ms$`))
})

test('the output verdict wins over the exit state', async ($, on) => {
  const { clock, status } = world(on, POM)
  shell(on, clock, 10, '[INFO] BUILD SUCCESS\n', true)

  await bash($, 'mvn verify')
  expect(status.at(-1)).toMatch(/^mvn ✓ /)
})

test('a Gradle run with no failures shows no failure count', async ($, on) => {
  const { clock, status } = world(on, { 'build.gradle': '' })
  shell(on, clock, 1500, '4 tests completed, 0 failed\nBUILD SUCCESSFUL in 1s\n')

  await bash($, 'gradle check')
  expect(status.at(-1)).toMatch(new RegExp(`^gradle ✓ ${TIME} · 1\\.5s · 4 tests$`))
})

test('speaks Spanish from the hub, with plural failures', async ($, on) => {
  const { clock, status } = world(on, POM, 'es')
  shell(on, clock, 1000, '[ERROR] Tests run: 9, Failures: 2, Errors: 1, Skipped: 0\n[INFO] BUILD FAILURE\n', true)

  await bash($, 'mvn test')
  expect(status.at(-1)).toMatch(new RegExp(`^mvn ✗ ${TIME} · 1\\.0s · 9 tests · 3 fallos$`))
})
