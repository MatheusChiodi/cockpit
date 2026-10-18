import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

const ANSWER = { result: {} } as never

// The world beneath the mod: the tools answer and the status line is recorded.
const world = (on: On) => {
  const status: (string | undefined)[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('tool.call', { tool: 'Read' }, () => ANSWER)
  on('tool.call', { tool: 'Edit' }, () => ANSWER)
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

let id = 0

const read = ($: Engine, path: string, agentId?: string) =>
  $.tool.call({ tool: 'Read', file_path: path, tool_use_id: `r${(id += 1)}`, ...(agentId === undefined ? {} : { agentId }) })

const edit = ($: Engine, path: string) =>
  $.tool.call({ tool: 'Edit', file_path: path, old_string: 'a', new_string: 'b', tool_use_id: `e${(id += 1)}` })

test('counts the files read and never edited once there are enough of them', async ($, on) => {
  const status = world(on)
  await $.session.start(START)

  for (const name of ['a', 'b', 'c', 'd']) {
    await read($, `/repo/${name}.ts`)
  }
  expect(status.every(text => text === undefined)).toBe(true)

  await read($, '/repo/e.ts')
  await read($, '/repo/e.ts')
  expect(status.at(-1)).toBe('read-only 5 of 5 files')

  await read($, '/repo/f.ts')
  await edit($, '/repo/f.ts')
  expect(status.at(-1)).toBe('read-only 5 of 6 files')
})

test('a file edited after it was read leaves the count, and subagent reads do not enter it', async ($, on) => {
  const status = world(on)
  await $.session.start(START)

  for (const name of ['a', 'b', 'c', 'd', 'e']) {
    await read($, `C:\\repo\\${name}.ts`)
  }
  await read($, '/repo/x.ts', 'sub')
  expect(status.at(-1)).toBe('read-only 5 of 5 files')

  await edit($, 'C:/repo/a.ts')
  expect(status.at(-1)).toBeUndefined()
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['read-only-status'], version: 1 } }))
  await $.session.start(START)

  for (const name of ['a', 'b', 'c', 'd', 'e']) {
    await read($, `/repo/${name}.ts`)
  }

  expect(status.every(text => text === undefined)).toBe(true)
})

test('speaks the language set in the hub', async ($, on) => {
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  await $.session.start(START)

  for (const name of ['a', 'b', 'c', 'd', 'e']) {
    await read($, `/repo/${name}.ts`)
  }

  expect(status.at(-1)).toBe('só leitura 5 de 5 arquivos')
})

test('a Write takes the file out of the count like an Edit', async ($, on) => {
  const status = world(on)
  on('tool.call', { tool: 'Write' }, () => ANSWER)
  await $.session.start(START)

  for (const name of ['a', 'b', 'c', 'd', 'e']) {
    await read($, `/repo/${name}.ts`)
  }
  expect(status.at(-1)).toBe('read-only 5 of 5 files')

  await $.tool.call({ tool: 'Write', file_path: '/repo/b.ts', content: 'x', tool_use_id: 'w1' })
  expect(status.at(-1)).toBeUndefined()
})

test('reads that failed or were denied are not counted', async ($, on) => {
  const status: (string | undefined)[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('tool.call', { tool: 'Read' }, (_$, e) =>
    e.file_path.includes('bad') ? ({ result: {}, isError: true } as never) : e.file_path.includes('deny') ? { deny: 'no' } : ANSWER,
  )
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })
  await $.session.start(START)

  for (const name of ['a', 'b', 'c', 'bad1', 'deny1', 'bad2']) {
    await read($, `/repo/${name}.ts`)
  }
  expect(status.every(text => text === undefined)).toBe(true)

  await read($, '/repo/d.ts')
  await read($, '/repo/e.ts')
  expect(status.at(-1)).toBe('read-only 5 of 5 files')
})

test('a new session starts the count over', async ($, on) => {
  const status = world(on)
  await $.session.start(START)

  for (const name of ['a', 'b', 'c', 'd', 'e']) {
    await read($, `/repo/${name}.ts`)
  }
  expect(status.at(-1)).toBe('read-only 5 of 5 files')

  await $.session.start(START)
  expect(status.at(-1)).toBeUndefined()

  await read($, '/repo/a.ts')
  expect(status.at(-1)).toBeUndefined()
})

test('does not redraw the same text twice', async ($, on) => {
  const status = world(on)
  await $.session.start(START)

  for (const name of ['a', 'b', 'c', 'd', 'e']) {
    await read($, `/repo/${name}.ts`)
  }
  const before = status.length
  await read($, '/repo/a.ts')
  await read($, String.raw`\repo\a.ts`)
  expect(status).toHaveLength(before)
})

// Stands in for the hub: a /flip command that writes its own `off` list, as the settings pane does.
const HUB = {
  name: 'cockpit',
  register: (on: On) => {
    on('command.run', { command: 'flip' }, async ($, e) => {
      await $.state.set({ plugin: 'cockpit', key: 'off' }, e.args === 'off' ? ['read-only-status'] : [])

      return { text: 'flipped' }
    })
  },
}

const flip = (args: string) => ({
  command: 'flip',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: false, columns: 80 },
})

test('clears the entry when the hub turns it off and shows it again on the next file', { plugins: [HUB] }, async ($, on) => {
  const status = world(on)
  await $.session.start(START)

  for (const name of ['a', 'b', 'c', 'd', 'e']) {
    await read($, `/repo/${name}.ts`)
  }
  expect(status.at(-1)).toBe('read-only 5 of 5 files')

  await $.command.run(flip('off'))
  expect(status.at(-1)).toBeUndefined()

  await $.command.run(flip('on'))
  await read($, '/repo/f.ts')
  expect(status.at(-1)).toBe('read-only 6 of 6 files')
})

test('speaks Spanish when the hub says so', async ($, on) => {
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  await $.session.start(START)

  for (const name of ['a', 'b', 'c', 'd', 'e']) {
    await read($, `/repo/${name}.ts`)
  }

  expect(status.at(-1)).toBe('solo lectura 5 de 5 archivos')
})
