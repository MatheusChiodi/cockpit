import { expect, test } from 'claude-code/testing'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

const fileOf = (path: string) => path.replaceAll('\\', '/').split('/').pop() ?? ''

// A project with `files` by name; returns what the status line shows.
const world = (on: any, files: Record<string, string>) => {
  const status: (string | undefined)[] = []

  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) => (fileOf(e.path) in files ? { value: files[fileOf(e.path)] } : { deny: 'ENOENT' }))
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

const PACKAGE = (expo: string) => JSON.stringify({ dependencies: { expo, react: '18' } })
const EAS = JSON.stringify({ build: { development: {}, preview: {}, production: {} } })

test('shows the SDK from the expo dependency and the EAS profiles', async ($, on) => {
  const status = world(on, { 'package.json': PACKAGE('~52.0.11'), 'eas.json': EAS })

  await $.session.start(START)
  expect(status).toEqual(['expo 52 · eas profiles development/preview/production'])
})

test('prefers the sdkVersion of app.json and works without eas.json', async ($, on) => {
  const status = world(on, { 'package.json': PACKAGE('latest'), 'app.json': JSON.stringify({ expo: { sdkVersion: '51.0.0' } }) })

  await $.session.start(START)
  expect(status).toEqual(['expo 51'])
})

test('stays silent in a project without Expo or with an unreadable package.json', async ($, on) => {
  const files: Record<string, string> = { 'package.json': JSON.stringify({ dependencies: { 'react-native': '0.76' } }), 'eas.json': EAS }
  const status = world(on, files)

  await $.session.start(START)
  expect(status).toEqual([])

  files['package.json'] = '{ not json'
  await $.session.start(START)
  expect(status).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const status = world(on, { 'package.json': PACKAGE('~52.0.0'), 'eas.json': EAS })
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  expect(status).toEqual(['expo 52 · eas perfis development/preview/production'])
})

test('finds expo among the devDependencies', async ($, on) => {
  const status = world(on, { 'package.json': JSON.stringify({ devDependencies: { expo: '^50.0.1' } }) })

  await $.session.start(START)
  expect(status).toEqual(['expo 50'])
})

test('shows at most four EAS profiles', async ($, on) => {
  const eas = JSON.stringify({ build: { a: {}, b: {}, c: {}, d: {}, e: {} } })
  const status = world(on, { 'package.json': PACKAGE('~52.0.0'), 'eas.json': eas })

  await $.session.start(START)
  expect(status).toEqual(['expo 52 · eas profiles a/b/c/d'])
})

test('shows just the label when no SDK number can be read', async ($, on) => {
  const status = world(on, { 'package.json': PACKAGE('latest'), 'app.json': '[1, 2]', 'eas.json': 'not json' })

  await $.session.start(START)
  expect(status).toEqual(['expo'])
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const status = world(on, { 'package.json': PACKAGE('~53.0.0'), 'eas.json': EAS })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.start(START)
  expect(status).toEqual(['expo 53 · eas perfiles development/preview/production'])
})
