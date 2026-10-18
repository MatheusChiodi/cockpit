import { expect, test } from 'claude-code/testing'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

const fileOf = (path: string) => path.replaceAll('\\', '/').split('/').pop() ?? ''

const JAVA = (version: string) => `openjdk version "${version}" 2024-01-16\nOpenJDK Runtime Environment (build ${version}+7)\n`

// A project with build `files`, running the java `printed` on stderr; returns the toasts seen and how often java was run.
const world = (on: any, files: Record<string, string>, printed: string) => {
  const toasts: string[] = []
  const runs: string[][] = []

  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) => (fileOf(e.path) in files ? { value: files[fileOf(e.path)] } : { deny: 'ENOENT' }))
  on('process.run', (_: unknown, e: { argv: string[] }) => {
    runs.push(e.argv)

    return { value: { exitCode: 0, stdout: '', stderr: printed, isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return { toasts, runs }
}

const POM = (tags: string) => `<project><properties>${tags}</properties></project>`

test('toasts when the java on the PATH is older than the pom declares', async ($, on) => {
  const { toasts } = world(on, { 'pom.xml': POM('<java.version>17</java.version>') }, JAVA('11.0.22'))

  await $.session.start(START)
  expect(toasts).toEqual(['jdk-match-toast: pom.xml declares JDK 17, the java on the PATH is 11'])
})

test('reads Gradle declarations and the old 1.8 numbering', async ($, on) => {
  const { toasts } = world(
    on,
    { 'build.gradle': "sourceCompatibility = JavaVersion.VERSION_11\ntargetCompatibility = '11'" },
    'java version "1.8.0_301"\n',
  )

  await $.session.start(START)
  expect(toasts).toEqual(['jdk-match-toast: build.gradle declares JDK 11, the java on the PATH is 8'])
})

test('reads a Kotlin DSL toolchain', async ($, on) => {
  const { toasts } = world(on, { 'build.gradle.kts': 'kotlin { jvmToolchain(21) }' }, JAVA('17.0.9'))

  await $.session.start(START)
  expect(toasts).toEqual(['jdk-match-toast: build.gradle.kts declares JDK 21, the java on the PATH is 17'])
})

test('stays silent when the java is the declared one or newer', async ($, on) => {
  const files: Record<string, string> = { 'pom.xml': POM('<maven.compiler.release>17</maven.compiler.release>') }
  const { toasts } = world(on, files, JAVA('21.0.1'))

  await $.session.start(START)
  expect(toasts).toEqual([])
})

test('stays silent for 1.8 on a Java 8 and for a pom that names no version', async ($, on) => {
  const { toasts } = world(on, { 'pom.xml': POM('<maven.compiler.source>1.8</maven.compiler.source>') }, 'java version "1.8.0_301"\n')

  await $.session.start(START)
  expect(toasts).toEqual([])
})

test('does nothing without a build file: java is not even run', async ($, on) => {
  const { toasts, runs } = world(on, { 'package.json': '{}' }, JAVA('8.0.1'))

  await $.session.start(START)
  expect(toasts).toEqual([])
  expect(runs).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const { toasts } = world(on, { 'pom.xml': POM('<java.version>17</java.version>') }, JAVA('11.0.22'))
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  expect(toasts).toEqual(['jdk-match-toast: pom.xml declara JDK 17, o java do PATH é o 11'])
})

test('stays silent when java is missing or prints no version', async ($, on) => {
  const toasts: string[] = []
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) =>
    fileOf(e.path) === 'pom.xml' ? { value: POM('<java.version>21</java.version>') } : { deny: 'ENOENT' },
  )
  on('process.run', () => ({ deny: 'java: command not found' }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)
  expect(toasts).toEqual([])
})

test('takes the highest version the pom names', async ($, on) => {
  const { toasts } = world(
    on,
    { 'pom.xml': POM('<maven.compiler.source>11</maven.compiler.source><maven.compiler.target>17</maven.compiler.target>') },
    JAVA('11.0.2'),
  )

  await $.session.start(START)
  expect(toasts).toEqual(['jdk-match-toast: pom.xml declares JDK 17, the java on the PATH is 11'])
})

test('falls through a pom with no version to the Gradle file', async ($, on) => {
  const { toasts } = world(
    on,
    { 'pom.xml': POM('<name>x</name>'), 'build.gradle': 'java { toolchain { languageVersion = JavaLanguageVersion.of(17) } }' },
    JAVA('11.0.2'),
  )

  await $.session.start(START)
  expect(toasts).toEqual(['jdk-match-toast: build.gradle declares JDK 17, the java on the PATH is 11'])
})

test('speaks Spanish when the hub says so', async ($, on) => {
  const { toasts } = world(on, { 'pom.xml': POM('<release>21</release>') }, JAVA('17.0.1'))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.start(START)
  expect(toasts).toEqual(['jdk-match-toast: pom.xml declara JDK 21, el java del PATH es el 17'])
})
