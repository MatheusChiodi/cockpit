import { expect, test } from 'claude-code/testing'

const slashed = (path: string) => path.replaceAll('\\', '/')

let counter = 0

// A project at /work with `deps` and the text of eas.json (if any); returns the toasts the person saw and the commands that ran.
const project = (on: any, deps: string[], eas?: string) => {
  const world = { toasts: [] as string[], ran: [] as string[] }
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) => {
    const path = slashed(e.path)

    if (path.endsWith('/work/package.json')) {
      return { value: JSON.stringify({ dependencies: Object.fromEntries(deps.map(name => [name, '1'])) }) }
    }

    return eas !== undefined && path.endsWith('/work/eas.json') ? { value: eas } : { deny: 'ENOENT' }
  })
  on('tool.call', { tool: 'Bash' }, (_: unknown, e: { command: string }) => {
    world.ran.push(e.command)

    return { result: { stdout: '', stderr: '', interrupted: false } }
  })
  on('ui.toast', (_: unknown, e: { text: string }) => {
    world.toasts.push(e.text)

    return { value: undefined }
  })

  return world
}

const run = ($: any, command: string) => {
  counter += 1

  return $.tool.call({ tool: 'Bash', command, tool_use_id: `b-${counter}` })
}

const DEV_CLIENT = ['expo', 'expo-dev-client']

test('refuses a plain install of a package the Expo SDK pins and names the expo install command', async ($, on) => {
  const world = project(on, ['expo'])

  const npm = await run($, 'npm install react-native-reanimated')
  expect(npm.deny).toContain('expo-install-guard: react-native-reanimated is pinned to the Expo SDK, and "npm install" fetches the latest version')
  expect(npm.deny).toContain('Run "npx expo install react-native-reanimated"')

  const yarn = await run($, 'yarn add expo-camera zod && echo done')
  expect(yarn.deny).toContain('expo-camera is pinned')
  expect(yarn.deny).toContain('"npx expo install expo-camera zod"')

  const scoped = await run($, 'pnpm add @react-native-async-storage/async-storage --save-dev')
  expect(scoped.deny).toContain('npx expo install @react-native-async-storage/async-storage')

  expect(world.ran).toEqual([])
})

test('lets expo install, unpinned packages, explicit versions and global installs through', async ($, on) => {
  const world = project(on, ['expo'])

  for (const command of [
    'npx expo install react-native-reanimated',
    'npm install zod axios',
    'npm install react-native-reanimated@3.6.1',
    'npm install -g expo-cli',
    'npm install',
    'npm run build',
    'git status',
  ]) {
    expect((await run($, command)).deny, command).toBeUndefined()
  }

  expect(world.toasts).toEqual([])
})

test('tells Claude to rebuild the development build after installing a native package', async ($, on) => {
  const world = project(on, DEV_CLIENT)

  const ran = await run($, 'npx expo install react-native-reanimated expo-camera zod')
  expect(ran.context?.[0]).toContain('expo-install-guard: react-native-reanimated, expo-camera adds native code')
  expect(ran.context?.[0]).toContain('rebuild the dev client (eas build --profile development')
  expect(world.toasts[0]).toBe('expo-install-guard: react-native-reanimated, expo-camera has native code, rebuild the development build before testing')

  const unpinned = await run($, 'npm install react-native-paper')
  expect(unpinned.context?.[0]).toContain('react-native-paper adds native code')
})

test('adds no rebuild note for JS-only packages or packages without native code', async ($, on) => {
  project(on, DEV_CLIENT)
  expect((await run($, 'npx expo install expo-router expo-status-bar')).context).toBeUndefined()
  expect((await run($, 'npm install zod')).context).toBeUndefined()
})

test('a development client declared only in eas.json also counts', async ($, on) => {
  project(on, ['expo'], '{"build":{"development":{"developmentClient":true}}}')

  expect((await run($, 'npx expo install expo-camera')).context?.[0]).toContain('expo-camera adds native code')
})

test('no rebuild note when the project has no development client', async ($, on) => {
  const world = project(on, ['expo'])

  expect((await run($, 'npx expo install expo-camera')).context).toBeUndefined()
  expect(world.toasts).toEqual([])
})

test('does nothing in a project that is not Expo', async ($, on) => {
  const world = project(on, ['react-native'])

  const answer = await run($, 'npm install react-native-reanimated')
  expect(answer.deny).toBeUndefined()
  expect(answer.context).toBeUndefined()
  expect(world.ran).toEqual(['npm install react-native-reanimated'])
})

test('speaks the language set in the hub', async ($, on) => {
  project(on, ['expo'])
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await run($, 'npm install react-native-svg')
  expect(answer.deny).toContain('expo-install-guard: react-native-svg tem versão fixada pelo Expo SDK')
  expect(answer.deny).toContain('Rode "npx expo install react-native-svg"')
})

test('refuses the same install in PowerShell', async ($, on) => {
  project(on, ['expo'])
  on('tool.call', { tool: 'PowerShell' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }) as never)

  const blocked = await $.tool.call({ tool: 'PowerShell', command: 'npm i expo-image', tool_use_id: 'p-1' })
  expect(blocked.deny).toContain('expo-image is pinned')

  const allowed = await $.tool.call({ tool: 'PowerShell', command: 'npx expo install expo-image', tool_use_id: 'p-2' })
  expect(allowed.deny).toBeUndefined()
})

test('sees through environment prefixes and other runners', async ($, on) => {
  project(on, ['expo'])

  expect((await run($, 'CI=1 npm i expo-haptics')).deny).toContain('expo-haptics is pinned')
  expect((await run($, 'bun add @expo/vector-icons')).deny).toContain('@expo/vector-icons is pinned')
  expect((await run($, 'bunx expo install expo-haptics')).deny).toBeUndefined()
  expect((await run($, 'pnpm dlx expo install expo-haptics')).deny).toBeUndefined()
})

test('an invalid package.json is not an Expo project', async ($, on) => {
  const world = { ran: 0 }
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', () => ({ value: '{ not json' }))
  on('tool.call', { tool: 'Bash' }, () => {
    world.ran += 1

    return { result: { stdout: '', stderr: '', interrupted: false } }
  })

  expect((await run($, 'npm install react-native-reanimated')).deny).toBeUndefined()
  expect(world.ran).toBe(1)
})

test('no rebuild note when the install itself failed', async ($, on) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) =>
    slashed(e.path).endsWith('/package.json')
      ? { value: JSON.stringify({ dependencies: { expo: '1', 'expo-dev-client': '1' } }) }
      : { deny: 'ENOENT' },
  )
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: 'E404', interrupted: false }, isError: true }) as never)
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  expect((await run($, 'npx expo install expo-camera')).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('names each native package once across chained installs', async ($, on) => {
  project(on, DEV_CLIENT)

  const ran = await run($, 'npx expo install expo-camera && npx expo install expo-camera expo-haptics')
  expect(ran.context?.[0]).toContain('expo-install-guard: expo-camera, expo-haptics adds native code')
})

test('speaks Spanish when the hub says so', async ($, on) => {
  const world = project(on, DEV_CLIENT)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const denied = await run($, 'npm install react-native-svg')
  expect(denied.deny).toContain('tiene la versión fijada por el Expo SDK')
  expect(denied.deny).toContain('Ejecuta "npx expo install react-native-svg"')

  await run($, 'npx expo install expo-camera')
  expect(world.toasts[0]).toBe('expo-install-guard: expo-camera tiene código nativo, rehaz el development build antes de probar')
})
