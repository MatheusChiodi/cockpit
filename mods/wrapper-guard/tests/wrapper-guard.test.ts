import { expect, test } from 'claude-code/testing'

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

let counter = 0

// A project at /work holding `present` files; the commands that reach the shell are counted.
const project = (on: any, present: string[]) => {
  const ran: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.exists', (_: unknown, e: { path: string }) => ({ value: present.some(name => e.path.replaceAll('\\', '/').endsWith(`/work/${name}`)) }))
  on('tool.call', { tool: 'Bash' }, (_: unknown, e: { command: string }) => {
    ran.push(e.command)

    return ANSWER
  })
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER)

  return ran
}

const bash = ($: any, command: string) => {
  counter += 1

  return $.tool.call({ tool: 'Bash', command, tool_use_id: `b-${counter}` })
}

test('refuses a global mvn when the project ships mvnw, and names the wrapper', async ($, on) => {
  const ran = project(on, ['mvnw', 'pom.xml'])

  for (const command of ['mvn clean test', 'cd app && mvn -q verify', 'JAVA_HOME=/jdk mvn package', 'mvn.cmd install']) {
    const answer = await bash($, command)
    expect(answer.deny, command).toContain('wrapper-guard blocked the command')
    expect(answer.deny, command).toContain('./mvnw')
  }

  expect(ran).toEqual([])
})

test('refuses a global gradle when gradlew is there, and names the PowerShell form', async ($, on) => {
  project(on, ['gradlew'])

  expect((await bash($, 'gradle build')).deny).toContain('./gradlew')

  const ps = await $.tool.call({ tool: 'PowerShell', command: 'gradle test', tool_use_id: 'p-1' })
  expect(ps.deny).toContain('.\\gradlew.bat')
})

test('lets the wrapper, the version check and other tools through', async ($, on) => {
  project(on, ['mvnw', 'gradlew'])

  for (const command of ['./mvnw clean test', 'sh ./gradlew build', 'mvn -v', 'mvn --version', 'echo mvn clean', 'npm test', 'git commit -m "mvn clean"']) {
    expect((await bash($, command)).deny, command).toBeUndefined()
  }
})

test('lets a global mvn run when only the other wrapper exists, or none', async ($, on) => {
  project(on, ['gradlew'])
  expect((await bash($, 'mvn test')).deny).toBeUndefined()
})

test('does nothing when the project ships no wrapper', async ($, on) => {
  const ran = project(on, ['pom.xml'])

  expect((await bash($, 'mvn clean test')).deny).toBeUndefined()
  expect((await bash($, 'gradle build')).deny).toBeUndefined()
  expect(ran.length).toBe(2)
})

test('speaks the language set in the hub', async ($, on) => {
  project(on, ['mvnw'])
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await bash($, 'mvn test')).deny).toContain('wrapper-guard bloqueou o comando: este projeto traz ./mvnw')
})

test('finds the global tool after sudo, a pipe, a semicolon or a newline, and alone', async ($, on) => {
  project(on, ['mvnw'])

  for (const command of ['sudo mvn install', 'echo start | mvn -B test', 'ls; mvn package', 'cd app\nmvn verify', 'mvn', 'false || MVN.CMD test']) {
    expect((await bash($, command)).deny, command).toContain('./mvnw')
  }
})

test('detects mvnw.cmd and gradlew.bat, and names them in PowerShell', async ($, on) => {
  project(on, ['mvnw.cmd', 'gradlew.bat'])

  const mvn = await $.tool.call({ tool: 'PowerShell', command: 'mvn clean install', tool_use_id: 'p-mvn' })
  expect(mvn.deny).toContain('.\\mvnw.cmd')
  expect(mvn.deny).toContain('Maven')

  const gradle = await $.tool.call({ tool: 'PowerShell', command: 'gradle.bat build', tool_use_id: 'p-gradle' })
  expect(gradle.deny).toContain('.\\gradlew.bat')
  expect(gradle.deny).toContain('Gradle')
})

test('lets gradle -version and words that only contain the tool name through', async ($, on) => {
  project(on, ['mvnw', 'gradlew'])

  for (const command of ['gradle -version', 'gradle --version -v', 'mvnd test', 'gradle-wrapper-check', 'cat mvn.log']) {
    expect((await bash($, command)).deny, command).toBeUndefined()
  }
})

test('refuses the command when the check itself fails', async ($, on) => {
  on('session.root', () => {
    throw new Error('no root')
  })
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  expect((await bash($, 'mvn test')).deny).toBe('wrapper-guard: the check failed, command refused.')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  project(on, ['gradlew'])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await bash($, 'gradle build')).deny).toContain('wrapper-guard bloqueó el comando: este proyecto trae ./gradlew, que fija la versión de Gradle')
})
