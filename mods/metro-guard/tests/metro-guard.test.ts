import { expect, test } from 'claude-code/testing'

const slashed = (path: string) => path.replaceAll('\\', '/')

// A project at /work with `deps` and `scripts`; `up` lists the ports where a bundler answers.
const world = (
  on: any,
  up: number[],
  deps: string[] = ['expo', 'react-native'],
  scripts: Record<string, string> = { start: 'expo start' },
  verdict: object = { decision: 'allow' },
) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) =>
    slashed(e.path).endsWith('/work/package.json')
      ? { value: JSON.stringify({ dependencies: Object.fromEntries(deps.map(name => [name, '1'])), scripts }) }
      : { deny: 'ENOENT' },
  )
  on('http.fetch', (_: unknown, e: { url: string }) => {
    if (!up.some(port => e.url === `http://localhost:${port}/status`)) {
      return { deny: 'connection refused' }
    }

    return { value: { status: 200, ok: true, headers: {}, text: 'packager-status:running' } }
  })
  on('tool.check', () => verdict)
}

const check = ($: any, command: string, tool = 'Bash') => $.tool.check({ tool, input: { command } })

test('asks before a second Metro starts on a port that already answers', async ($, on) => {
  world(on, [8081, 8082])

  for (const command of ['npx expo start', 'expo start --android', 'npm start', 'npm run start', 'yarn start', 'npx react-native start', 'cd app && npx expo start -c']) {
    const verdict = await check($, command)
    expect(verdict.decision, command).toBe('ask')
    expect(verdict.reason, command).toContain('metro-guard: Metro is already running on port 8081')
  }

  expect((await check($, 'npx expo start --port 8082')).reason).toContain('port 8082')
  expect((await check($, 'RCT_METRO_PORT=8082 npx react-native start', 'PowerShell')).decision).toBe('ask')
})

test('reads the start script when the command is a package manager script', async ($, on) => {
  world(on, [8083], ['expo'], { dev: 'expo start --port 8083' })

  expect((await check($, 'npm run dev')).reason).toContain('port 8083')
})

test('lets the command through when it starts no bundler or the port is free', async ($, on) => {
  world(on, [8081], ['expo'], { start: 'expo start', test: 'jest', build: 'tsc' })

  for (const command of ['npm test', 'npm run build', 'npx expo install expo-camera', 'npx expo run:android', 'git status']) {
    expect((await check($, command)).decision, command).toBe('allow')
  }
})

test('lets Metro start when its port is free', async ($, on) => {
  world(on, [])

  expect((await check($, 'npx expo start')).decision).toBe('allow')
})

test('does nothing in a project without Expo or React Native', async ($, on) => {
  world(on, [8081], ['react', 'vite'], { start: 'expo start' })

  expect((await check($, 'npx expo start')).decision).toBe('allow')
})

test('does not loosen a verdict that is already a deny', async ($, on) => {
  world(on, [8081], undefined, undefined, { decision: 'deny', reason: 'blocked beneath' })

  expect((await check($, 'npx expo start')).decision).toBe('deny')
})

test('speaks the language set in the hub', async ($, on) => {
  world(on, [8081])
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await check($, 'npx expo start')).reason).toContain('metro-guard: o Metro já está rodando na porta 8081')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  world(on, [8081])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await check($, 'npx expo start')).reason).toContain('metro-guard: Metro ya está corriendo en el puerto 8081')
})

test('reads -p and --port= flags, and a script that starts React Native', async ($, on) => {
  world(on, [19000, 8090], ['react-native'], { dev: 'react-native start --port=8090' })

  expect((await check($, 'npx expo start -p 19000')).reason).toContain('port 19000')
  expect((await check($, 'yarn dev')).reason).toContain('port 8090')
  expect((await check($, 'CI=1 pnpm run dev')).reason).toContain('port 8090')
})

test('a start script that runs no bundler is let through', async ($, on) => {
  world(on, [8081], ['expo'], { start: 'node server.js' })

  expect((await check($, 'npm start')).decision).toBe('allow')
})

test('leaves other tools and inputs without a command alone', async ($, on) => {
  world(on, [8081])

  expect((await $.tool.check({ tool: 'Read', input: { file_path: 'a' } })).decision).toBe('allow')
  expect((await $.tool.check({ tool: 'Bash', input: { command: 42 } })).decision).toBe('allow')
})

test('an invalid package.json detects no stack', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', () => ({ value: '{ nope' }))
  on('http.fetch', () => ({ value: { status: 200, ok: true, headers: {}, text: 'packager-status:running' } }))
  on('tool.check', () => ({ decision: 'allow' }))

  expect((await check($, 'npx expo start')).decision).toBe('allow')
})

test('asks with the failure text when the check itself fails', async ($, on) => {
  world(on, [8081])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ deny: 'state unavailable' }))

  expect(await check($, 'npx expo start')).toMatchObject({
    decision: 'ask',
    reason: 'metro-guard: the check failed, confirm no Metro bundler is already running.',
  })
})
