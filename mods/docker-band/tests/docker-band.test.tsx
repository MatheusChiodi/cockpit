import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'docker-band',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 }, view: {} },
  viewport: { columns: 120, rows: 40 },
} as const

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

type Setup = { files: string[]; daemon: 'up' | 'down' | 'missing'; services: string[]; running: string[] }

const world = (on: any, setup: Setup, off: string[] = [], lang = 'en') => {
  mock.clock(on)
  const fileOf = (path: string) => path.replaceAll('\\', '/').split('/').pop() ?? ''

  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/repo' }))
  on('fs.exists', (_: unknown, e: { path: string }) => ({ value: setup.files.includes(fileOf(e.path)) }))
  on('process.run', (_: unknown, e: { argv: string[] }) => {
    if (setup.daemon === 'missing') {
      throw new Error('spawn docker ENOENT')
    }

    if (e.argv[1] === 'info') {
      return setup.daemon === 'up' ? done(0, '27.0.1\n') : done(1)
    }

    return e.argv[2] === 'config' ? done(0, `${setup.services.join('\n')}\n`) : done(0, `${setup.running.join('\n')}\n`)
  })
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: off, version: 1 } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  on('ui.render', { component: 'AbovePrompt' }, ($: any, e: any) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
}

const has = async (ui: any, text: RegExp) => (await ui.find({ type: 'Text', text })) !== undefined

const draw = async ($: any, surface: 'terminal' | 'desktop' = 'terminal') => {
  await $.session.start(START)

  return $.ui.mount({ ...BAND, surface })
}

const STACK = { files: ['docker-compose.yml'], daemon: 'up', services: ['web', 'db', 'cache'], running: ['web'] } as const

test('lists the services of the stack that are stopped', async ($, on) => {
  world(on, { ...STACK, files: [...STACK.files], services: [...STACK.services], running: [...STACK.running] })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await draw($, surface)

    expect(await has(ui, /DOCKER/)).toBe(true)
    expect(await has(ui, /compose 1\/3 up/)).toBe(true)
    expect(await has(ui, /stopped: db {2}cache/)).toBe(true)
    await ui.unmount()
  }
})

test('warns when the daemon is down', async ($, on) => {
  world(on, { files: ['Dockerfile'], daemon: 'down', services: [], running: [] })

  const ui = await draw($)
  expect(await has(ui, /daemon down/)).toBe(true)
  await ui.unmount()
})

test('draws nothing when every service is up', async ($, on) => {
  world(on, { files: ['compose.yaml'], daemon: 'up', services: ['web', 'db'], running: ['db', 'web'] })

  const ui = await draw($)
  expect(await has(ui, /DOCKER/)).toBe(false)
  await ui.unmount()
})

test('draws nothing without a compose file or a Dockerfile', async ($, on) => {
  world(on, { files: [], daemon: 'down', services: [], running: [] })

  const bare = await draw($)
  expect(await has(bare, /DOCKER/)).toBe(false)
  await bare.unmount()
})

test('draws nothing when the docker command is not installed', async ($, on) => {
  world(on, { files: ['Dockerfile'], daemon: 'missing', services: [], running: [] })

  const missing = await draw($)
  expect(await has(missing, /DOCKER/)).toBe(false)
  await missing.unmount()
})

test('hides while the hub lists it as off', async ($, on) => {
  world(on, { files: ['Dockerfile'], daemon: 'down', services: [], running: [] }, ['docker-band'])

  const ui = await draw($)
  expect(await has(ui, /DOCKER/)).toBe(false)
  await ui.unmount()
})

test('speaks the language set in the hub', async ($, on) => {
  world(on, { files: ['Dockerfile'], daemon: 'down', services: [], running: [] }, [], 'pt')

  const ui = await draw($)
  expect(await has(ui, /daemon parado/)).toBe(true)
  await ui.unmount()
})
