import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'env-drift-band',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 }, view: {} },
  viewport: { columns: 120, rows: 40 },
} as const

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

const world = (on: any, files: Record<string, string>, off: string[] = [], lang = 'en') => {
  mock.clock(on)
  const fileOf = (path: string) => path.replaceAll('\\', '/').split('/').pop() ?? ''

  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/repo' }))
  on('fs.read', (_: unknown, e: { path: string }) => ({ value: files[fileOf(e.path)] as never }))
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

const EXAMPLE = 'DATABASE_URL=\nSTRIPE_KEY=\nREDIS_URL=\n# comment\nSENTRY_DSN=\nexport PORT=3000\n'

test('lists the keys of .env.example that .env lacks, names only', async ($, on) => {
  world(on, { '.env.example': EXAMPLE, '.env': 'DATABASE_URL=postgres://user:hunter2@db/app\nPORT=80\n' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await draw($, surface)

    expect(await has(ui, /ENV/)).toBe(true)
    expect(await has(ui, /3 missing/)).toBe(true)
    expect(await has(ui, /STRIPE_KEY {2}REDIS_URL {2}SENTRY_DSN/)).toBe(true)
    expect(await has(ui, /hunter2/)).toBe(false)
    await ui.unmount()
  }
})

test('cuts the list after three names and counts the rest', async ($, on) => {
  world(on, { '.env.example': 'A=\nB=\nC=\nD=\nE=\n', '.env': 'A=1\n' })

  const ui = await draw($)
  expect(await has(ui, /4 missing/)).toBe(true)
  expect(await has(ui, /\+1/)).toBe(true)
  await ui.unmount()
})

test('counts keys from .env.local too and draws nothing when none is missing', async ($, on) => {
  world(on, { '.env.example': 'A=\nB=\n', '.env': 'A=1\n', '.env.local': 'B=2\n' })

  const ui = await draw($)
  expect(await has(ui, /ENV/)).toBe(false)
  await ui.unmount()
})

test('draws nothing without an example file', async ($, on) => {
  world(on, { '.env': 'A=1\n' })

  const ui = await draw($)
  expect(await has(ui, /ENV/)).toBe(false)
  await ui.unmount()
})

test('hides while the hub lists it as off', async ($, on) => {
  world(on, { '.env.example': 'A=\n' }, ['env-drift-band'])

  const ui = await draw($)
  expect(await has(ui, /ENV/)).toBe(false)
  await ui.unmount()
})

test('speaks the language set in the hub', async ($, on) => {
  world(on, { '.env.example': 'A=\n' }, [], 'pt')

  const ui = await draw($)
  expect(await has(ui, /1 faltando/)).toBe(true)
  await ui.unmount()
})
