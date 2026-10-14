import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'runtime-band',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 }, view: {} },
  viewport: { columns: 120, rows: 40 },
} as const

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

type Project = { files: Record<string, string>; installed: Record<string, string> }

const world = (on: any, project: Project, off: string[] = [], lang = 'en') => {
  mock.clock(on)
  const fileOf = (path: string) => path.replaceAll('\\', '/').split('/').pop() ?? ''

  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/repo' }))
  on('fs.read', (_: unknown, e: { path: string }) => ({ value: project.files[fileOf(e.path)] as never }))
  on('process.run', (_: unknown, e: { argv: string[] }) => {
    const version = project.installed[e.argv[0] ?? '']

    if (version === undefined) {
      return done(127)
    }

    return e.argv[0] === 'java' ? done(0, '', `openjdk version "${version}" 2023-10-17`) : done(0, `${version}\n`)
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

test('shows what the project asks for and what is installed', async ($, on) => {
  world(on, { files: { '.nvmrc': 'v20.11.0\n' }, installed: { node: 'v18.19.0' } })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await draw($, surface)

    expect(await has(ui, /RUNTIME/)).toBe(true)
    expect(await has(ui, /node asks 20\.11\.0/)).toBe(true)
    expect(await has(ui, /has 18\.19\.0/)).toBe(true)
    await ui.unmount()
  }
})

test('draws nothing when the installed versions match', async ($, on) => {
  world(on, {
    files: { '.nvmrc': '20', '.python-version': '3.12\n', '.java-version': '17' },
    installed: { node: 'v20.11.1', python: 'Python 3.12.4', java: '17.0.9' },
  })

  const ui = await draw($)
  expect(await has(ui, /RUNTIME/)).toBe(false)
  await ui.unmount()
})

test('reads package.json engines and .tool-versions, with range operators', async ($, on) => {
  world(on, {
    files: { 'package.json': JSON.stringify({ engines: { node: '>=20' } }), '.tool-versions': 'python 3.11.2\njava 17\n' },
    installed: { node: 'v18.0.0', python: 'Python 3.12.1', java: '17.0.2' },
  })

  const ui = await draw($)
  expect(await has(ui, /node asks >=20/)).toBe(true)
  expect(await has(ui, /python asks 3\.11\.2/)).toBe(true)
  expect(await has(ui, /java asks/)).toBe(false)
  await ui.unmount()
})

test('draws nothing when the runtime is not installed', async ($, on) => {
  world(on, { files: { '.nvmrc': '20' }, installed: {} })

  const ui = await draw($)
  expect(await has(ui, /RUNTIME/)).toBe(false)
  await ui.unmount()
})

test('hides while the hub lists it as off', async ($, on) => {
  world(on, { files: { '.nvmrc': '20' }, installed: { node: 'v18.0.0' } }, ['runtime-band'])

  const ui = await draw($)
  expect(await has(ui, /RUNTIME/)).toBe(false)
  await ui.unmount()
})

test('speaks the language set in the hub', async ($, on) => {
  world(on, { files: { '.nvmrc': '20' }, installed: { node: 'v18.0.0' } }, [], 'pt')

  const ui = await draw($)
  expect(await has(ui, /node pede 20/)).toBe(true)
  expect(await has(ui, /tem 18\.0\.0/)).toBe(true)
  await ui.unmount()
})
