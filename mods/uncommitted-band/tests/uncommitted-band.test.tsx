import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'uncommitted-band',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 }, view: {} },
  viewport: { columns: 120, rows: 40 },
} as const

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

// The hub's switch and language, plus the empty box the engine would draw with no mod.
const hub = (on: any, off: string[] = [], lang = 'en') => {
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
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

const NOW = Date.UTC(2026, 9, 13, 12, 0, 0)

// git status lists `changed` files; git log says the last commit was `minutesAgo` minutes ago.
const repo = (on: any, changed: number, minutesAgo: number, isRepo = true) => {
  mock.clock(on, { now: NOW })
  on('process.run', (_: unknown, e: { argv: string[] }) => {
    if (!isRepo) {
      return done(128)
    }

    return e.argv[1] === 'status'
      ? done(0, Array.from({ length: changed }, (_, i) => ` M f${i}.ts\n`).join(''))
      : done(0, `${(NOW - minutesAgo * 60000) / 1000}\n`)
  })
}

test('warns about files left uncommitted for a long time', async ($, on) => {
  hub(on)
  repo(on, 3, 90)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await draw($, surface)

    expect(await has(ui, /3 uncommitted files/)).toBe(true)
    expect(await has(ui, /last 1h30 ago/)).toBe(true)
    await ui.unmount()
  }
})

test('stays quiet for a recent commit, a clean tree or no repository', async ($, on) => {
  hub(on)
  repo(on, 3, 10)
  expect(await has(await draw($), /uncommitted/)).toBe(false)
})

test('stays quiet when nothing is changed', async ($, on) => {
  hub(on)
  repo(on, 0, 300)
  expect(await has(await draw($), /uncommitted/)).toBe(false)
})

test('stays quiet outside a repository', async ($, on) => {
  hub(on)
  repo(on, 3, 300, false)
  expect(await has(await draw($), /uncommitted/)).toBe(false)
})

test('hides while the hub lists it as off', async ($, on) => {
  hub(on, ['uncommitted-band'])
  repo(on, 3, 90)
  expect(await has(await draw($), /uncommitted/)).toBe(false)
})

test('speaks the language set in the hub', async ($, on) => {
  hub(on, [], 'pt')
  repo(on, 1, 50)

  const ui = await draw($)
  expect(await has(ui, /1 arquivo sem commit/)).toBe(true)
  expect(await has(ui, /último há 50min/)).toBe(true)
})
