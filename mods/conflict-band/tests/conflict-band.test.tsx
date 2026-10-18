import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'conflict-band',
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

// `operation` is the ref git can resolve (MERGE_HEAD...); `status` is the porcelain output.
const repo = (on: any, status: string | null, operation = '') => {
  mock.clock(on)
  on('process.run', (_: unknown, e: { argv: string[] }) => {
    if (status === null) {
      return done(128)
    }

    if (e.argv[1] === 'status') {
      return done(0, status)
    }

    return e.argv.includes(operation) ? done(0, 'abc123\n') : done(1)
  })
}

test('shows the operation in progress and the files to resolve', async ($, on) => {
  hub(on)
  repo(on, 'UU a.ts\nAA b.ts\n M c.ts\n', 'MERGE_HEAD')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await draw($, surface)

    expect(await has(ui, /CONFLICT/)).toBe(true)
    expect(await has(ui, /merge in progress/)).toBe(true)
    expect(await has(ui, /2 files to resolve/)).toBe(true)
    await ui.unmount()
  }
})

test('names a rebase, and says when only the finishing is left', async ($, on) => {
  hub(on)
  repo(on, ' M a.ts\n', 'REBASE_HEAD')

  const ui = await draw($)
  expect(await has(ui, /rebase in progress/)).toBe(true)
  expect(await has(ui, /nothing pending, just finish it/)).toBe(true)
})

test('shows conflicted files with no operation running', async ($, on) => {
  hub(on)
  repo(on, 'UU a.ts\n')

  const ui = await draw($)
  expect(await has(ui, /files in conflict/)).toBe(true)
  expect(await has(ui, /1 file to resolve/)).toBe(true)
})

test('stays quiet on a tree with ordinary changes only', async ($, on) => {
  hub(on)
  repo(on, ' M a.ts\n')
  expect(await has(await draw($), /CONFLICT/)).toBe(false)
})

test('stays quiet outside a repository', async ($, on) => {
  hub(on)
  repo(on, null)
  expect(await has(await draw($), /CONFLICT/)).toBe(false)
})

test('hides while the hub lists it as off', async ($, on) => {
  hub(on, ['conflict-band'])
  repo(on, 'UU a.ts\n', 'MERGE_HEAD')
  expect(await has(await draw($), /CONFLICT/)).toBe(false)
})

test('speaks the language set in the hub', async ($, on) => {
  hub(on, [], 'pt')
  repo(on, 'UU a.ts\nUU b.ts\n', 'CHERRY_PICK_HEAD')

  const ui = await draw($)
  expect(await has(ui, /cherry-pick em andamento/)).toBe(true)
  expect(await has(ui, /2 arquivos para resolver/)).toBe(true)
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  hub(on, [], 'es')
  repo(on, 'UU a.ts\n', 'REVERT_HEAD')

  const ui = await draw($)
  expect(await has(ui, /CONFLICTO/)).toBe(true)
  expect(await has(ui, /revert en curso/)).toBe(true)
  expect(await has(ui, /1 archivo por resolver/)).toBe(true)
})

test('counts every unmerged status code and ignores the rest', async ($, on) => {
  hub(on)
  repo(on, 'DD a.ts\nAU b.ts\nUA c.ts\nDU d.ts\nUD e.ts\nA  f.ts\n?? g.ts\n D h.ts\n')

  expect(await has(await draw($), /5 files to resolve/)).toBe(true)
})

test('hides while a survey takes the space above the prompt', async ($, on) => {
  hub(on)
  repo(on, 'UU a.ts\n', 'MERGE_HEAD')
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, hasSurvey: true } })
  expect(await has(ui, /CONFLICT/)).toBe(false)
})

test('picks up a resolved conflict when the turn completes', async ($, on) => {
  hub(on)
  mock.clock(on)
  const tree = { status: 'UU a.ts\n' }
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('process.run', (_, e) => (e.argv[1] === 'status' ? done(0, tree.status) : done(1)))

  const ui = await draw($)
  expect(await has(ui, /files in conflict/)).toBe(true)

  tree.status = ' M a.ts\n'
  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't-1', reason: 'answer' })
  expect(await has(ui, /CONFLICT/)).toBe(false)
})

test('stays quiet when git cannot be run at all', async ($, on) => {
  hub(on)
  mock.clock(on)
  on('process.run', () => {
    throw new Error('git not found')
  })

  expect(await has(await draw($), /CONFLICT/)).toBe(false)
})
