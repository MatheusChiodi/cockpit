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
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
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

test('reads git again after a tool that changes files, not after a read', async ($, on) => {
  const state: { calls: number; git: Record<string, string> } = { calls: 0, git: { ...GIT, status: '## main\n', diff: '' } }
  const clock = mock.clock(on)
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    state.calls += 1

    return done(0, state.git[e.argv[2] ?? ''] ?? '')
  })
  on('tool.call', { tool: 'Edit' }, () => ({ result: {} }) as never)
  on('tool.call', { tool: 'Read' }, () => ({ result: {} }) as never)
  on('ui.render', { component: 'AbovePrompt' }, ($: any, e: any) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })

  await $.session.start(START)
  const before = state.calls

  await $.tool.call({ tool: 'Read', file_path: '/repo/a.ts', tool_use_id: 'r1' } as never)
  await clock.settle()
  expect(state.calls).toBe(before)

  state.git = GIT
  await $.tool.call({ tool: 'Edit', file_path: '/repo/a.ts', old_string: 'a', new_string: 'b', tool_use_id: 'e1' })
  await clock.settle()
  expect(state.calls).toBeGreaterThan(before)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /±2/ })).toBeDefined()
  await ui.unmount()
})

test('names the branch of a repository with no commits yet', async ($, on) => {
  world(on, { status: '## No commits yet on trunk\n?? a.ts\n', diff: '', log: '' })
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /trunk/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /±1/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: / · / })).toBeUndefined()
  await ui.unmount()
})

test('cuts a long commit subject to 48 characters', async ($, on) => {
  world(on, { ...GIT, log: `${'s'.repeat(70)}\t1 day ago\n` })
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: new RegExp(`${'s'.repeat(48)} · 1 day ago`) })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: new RegExp('s'.repeat(49)) })).toBeUndefined()
  await ui.unmount()
})

test('keeps the band beneath and steps aside for a survey', async ($, on) => {
  mock.clock(on)
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => done(0, GIT[e.argv[2] ?? ''] ?? ''))
  on('ui.render', { component: 'AbovePrompt' }, ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)

    return <Text>beneath</Text>
  })
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /beneath/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /GIT/ })).toBeDefined()
  await ui.unmount()

  const survey = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true }, surface: 'terminal' })
  expect(await survey.find({ type: 'Text', text: /beneath/ })).toBeDefined()
  expect(await survey.find({ type: 'Text', text: /GIT/ })).toBeUndefined()
  await survey.unmount()
})

test('speaks Spanish when the hub says so', async ($, on) => {
  world(on, { ...GIT, status: '## main\n', diff: '' }, [], 'es')
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /limpio/ })).toBeDefined()
  await ui.unmount()
})
