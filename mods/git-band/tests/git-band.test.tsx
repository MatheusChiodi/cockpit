import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'git-band',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 }, view: {} },
  viewport: { columns: 120, rows: 40 },
} as const

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

const GIT: Record<string, string> = {
  status: '## main...origin/main [ahead 2, behind 1]\n M a.ts\n?? b.ts\n',
  diff: ' 2 files changed, 10 insertions(+), 3 deletions(-)\n',
  log: 'fix login\t2 hours ago\n',
}

const world = (on: any, git: Record<string, string> | null, off: string[] = [], lang = 'en') => {
  mock.clock(on)
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('process.run', (_: unknown, e: { argv: string[] }) => {
    if (git === null) {
      return done(128)
    }

    return done(0, git[e.argv[2] ?? ''] ?? '')
  })
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: off, version: 1 } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  on('ui.render', { component: 'AbovePrompt' }, ($: any, e: any) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
}

test('shows branch, changes, ahead and behind, and the last commit', async ($, on) => {
  world(on, GIT)
  await $.session.start(START)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect(await ui.find({ type: 'Text', text: /GIT/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /main/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /±2/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /\+10/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /↑2/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /↓1/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /fix login · 2 hours ago/ })).toBeDefined()
    await ui.unmount()
  }
})

test('says clean when nothing changed', async ($, on) => {
  world(on, { ...GIT, status: '## main\n', diff: '' })
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /clean/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /±/ })).toBeUndefined()
  await ui.unmount()
})

test('draws nothing outside a git repository', async ($, on) => {
  world(on, null)
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /GIT/ })).toBeUndefined()
  await ui.unmount()
})

test('hides while the hub lists it as off', async ($, on) => {
  world(on, GIT, ['git-band'])
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /GIT/ })).toBeUndefined()
  await ui.unmount()
})

test('speaks the language set in the hub', async ($, on) => {
  world(on, { ...GIT, status: '## main\n', diff: '' }, [], 'pt')
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /limpo/ })).toBeDefined()
  await ui.unmount()
})
