import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const BAND = {
  plugin: 'hands-band',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 }, view: {} },
  viewport: { columns: 120, rows: 40 },
} as const

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

// The world beneath the mod: git answers with a status, and the tools succeed.
const world = (on: On, status: string | null) => {
  mock.clock(on)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('process.run', () => (status === null ? done(128) : done(0, status)))
  on('tool.call', { tool: 'Edit' }, () => ({ result: {} }) as never)
  on('tool.call', { tool: 'Write' }, () => ({ result: {} }) as never)
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
}

const STATUS = ' M src/a.ts\n M src/b.ts\n?? notes.md\n'

test('splits the uncommitted files into the ones Claude edited and the ones you changed', async ($, on) => {
  world(on, STATUS)
  await $.session.start(START)
  await $.tool.call({ tool: 'Edit', file_path: '/repo/src/a.ts', old_string: 'a', new_string: 'b', tool_use_id: 'e1' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect(await ui.find({ type: 'Text', text: /HANDS/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Claude 1/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /you 2/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /uncommitted/ })).toBeDefined()
    await ui.unmount()
  }
})

test('matches a Windows path with backslashes', async ($, on) => {
  world(on, ' M src/a.ts\n')
  await $.session.start(START)
  await $.tool.call({ tool: 'Write', file_path: 'C:\\repo\\src\\a.ts', content: 'x', tool_use_id: 'w1' })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Claude 1/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /you 0/ })).toBeDefined()
  await ui.unmount()
})

test('draws nothing when the tree is clean or is not a repository', async ($, on) => {
  world(on, '')
  await $.session.start(START)

  const clean = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await clean.find({ type: 'Text', text: /HANDS/ })).toBeUndefined()
  await clean.unmount()
})

test('draws nothing outside a git repository', async ($, on) => {
  world(on, null)
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /HANDS/ })).toBeUndefined()
  await ui.unmount()
})

test('hides while the hub lists it as off', async ($, on) => {
  world(on, STATUS)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['hands-band'], version: 1 } }))
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /HANDS/ })).toBeUndefined()
  await ui.unmount()
})

test('speaks the language set in the hub', async ($, on) => {
  world(on, STATUS)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /você 3/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /sem commit/ })).toBeDefined()
  await ui.unmount()
})

test('a refused or failed edit does not count as Claude\'s', async ($, on) => {
  mock.clock(on)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('process.run', () => done(0, STATUS))
  on('tool.call', { tool: 'Edit' }, () => ({ deny: 'no' }) as never)
  on('tool.call', { tool: 'Write' }, () => ({ result: {}, isError: true }) as never)
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })

  await $.session.start(START)
  await $.tool.call({ tool: 'Edit', file_path: '/repo/src/a.ts', old_string: 'a', new_string: 'b', tool_use_id: 'e1' })
  await $.tool.call({ tool: 'Write', file_path: '/repo/src/b.ts', content: 'x', tool_use_id: 'w1' })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Claude 0/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /you 3/ })).toBeDefined()
  await ui.unmount()
})

test('counts a renamed file by its new path', async ($, on) => {
  world(on, 'R  src/old.ts -> src/new.ts\n M "src/with space.ts"\n')
  await $.session.start(START)
  await $.tool.call({ tool: 'Write', file_path: '/repo/src/new.ts', content: 'x', tool_use_id: 'w1' })
  await $.tool.call({ tool: 'Write', file_path: '/repo/src/with space.ts', content: 'x', tool_use_id: 'w2' })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Claude 2/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /you 0/ })).toBeDefined()
  await ui.unmount()
})

test('a Bash command and the minute timer read the status again', async ($, on) => {
  const git = { status: STATUS }
  const clock = mock.clock(on)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('process.run', () => done(0, git.status))
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })

  await $.session.start(START)
  git.status = ''
  await $.tool.call({ tool: 'Bash', command: 'git stash', tool_use_id: 'b1' })
  await clock.settle()

  const stashed = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await stashed.find({ type: 'Text', text: /HANDS/ })).toBeUndefined()
  await stashed.unmount()

  git.status = ' M src/c.ts\n'
  await clock.advance(60000)
  const edited = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await edited.find({ type: 'Text', text: /you 1/ })).toBeDefined()
  await edited.unmount()
})

test('keeps the band of the mods beneath', async ($, on) => {
  mock.clock(on)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('process.run', () => done(0, STATUS))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>beneath</Text>
  })

  await $.session.start(START)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /beneath/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /HANDS/ })).toBeDefined()
  await ui.unmount()
})

test('speaks Spanish when the hub says so', async ($, on) => {
  world(on, STATUS)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /MANOS/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /tú 3/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /sin commit/ })).toBeDefined()
  await ui.unmount()
})
