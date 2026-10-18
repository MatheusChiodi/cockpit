import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const ANSWER = { result: {} } as never

// The world beneath the mod: the tools answer and the status line is recorded.
const world = (on: On) => {
  const status: (string | undefined)[] = []
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('tool.call', { tool: 'Read' }, () => ANSWER)
  on('tool.call', { tool: 'Grep' }, () => ANSWER)
  on('tool.call', { tool: 'Edit' }, () => ANSWER)
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

let id = 0

const read = ($: Engine, agentId?: string) =>
  $.tool.call({ tool: 'Read', file_path: '/a.ts', tool_use_id: `r${(id += 1)}`, ...(agentId === undefined ? {} : { agentId }) })

const edit = ($: Engine) =>
  $.tool.call({ tool: 'Edit', file_path: '/a.ts', old_string: 'a', new_string: 'b', tool_use_id: `e${(id += 1)}` })

test('says exploring while reads pile up, then mixed and changing as edits come', async ($, on) => {
  const status = world(on)
  await $.turn.start({ text: 'go', turnId: 't1' })

  for (let n = 0; n < 3; n += 1) {
    await read($)
  }
  expect(status.at(-1)).toBeUndefined()

  await read($)
  await read($)
  expect(status.at(-1)).toBe('explore 5 reads · 0 edits · exploring')

  await edit($)
  await edit($)
  await edit($)
  expect(status.at(-1)).toBe('explore 5 reads · 3 edits · mixed')

  await edit($)
  await edit($)
  expect(status.at(-1)).toBe('explore 5 reads · 5 edits · changing')
})

test('starts over with the next turn and ignores subagents', async ($, on) => {
  const status = world(on)
  await $.turn.start({ text: 'go', turnId: 't2' })
  await read($, 'sub')
  await read($, 'sub')
  await read($, 'sub')
  await read($, 'sub')
  expect(status.every(text => text === undefined)).toBe(true)

  for (let n = 0; n < 4; n += 1) {
    await read($)
  }
  expect(status.at(-1)).toBe('explore 4 reads · 0 edits · exploring')

  await $.turn.start({ text: 'again', turnId: 't3' })
  expect(status.at(-1)).toBeUndefined()
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['explore-status'], version: 1 } }))
  await $.turn.start({ text: 'go', turnId: 't4' })

  for (let n = 0; n < 5; n += 1) {
    await read($)
  }

  expect(status.every(text => text === undefined)).toBe(true)
})

test('speaks the language set in the hub', async ($, on) => {
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  await $.turn.start({ text: 'go', turnId: 't5' })

  for (let n = 0; n < 4; n += 1) {
    await read($)
  }

  expect(status.at(-1)).toBe('explorar 4 leituras · 0 edições · explorando')
})

// Stands in for the hub: a /flip command that writes its own `off` list, as the settings pane does.
const HUB = {
  name: 'cockpit',
  register: (on: any) => {
    on('command.run', { command: 'flip' }, async ($: any, e: any) => {
      await $.state.set({ plugin: 'cockpit', key: 'off' }, e.args === 'off' ? ['explore-status'] : [])

      return { text: 'flipped' }
    })
  },
}

const flip = (args: string) =>
  ({ command: 'flip', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } }) as const

test('clears the entry when the hub turns it off, and stays clear', { plugins: [HUB] }, async ($, on) => {
  const status = world(on)
  await $.turn.start({ text: 'go', turnId: 't6' })

  for (let n = 0; n < 4; n += 1) {
    await read($)
  }
  expect(status.at(-1)).toBe('explore 4 reads · 0 edits · exploring')

  await $.command.run(flip('off'))
  expect(status.at(-1)).toBeUndefined()

  await read($)
  expect(status.at(-1)).toBeUndefined()

  await $.command.run(flip('on'))
  await read($)
  expect(status.at(-1)).toBe('explore 6 reads · 0 edits · exploring')
})

test('counts only calls that ran, and only reads and edits', async ($, on) => {
  const status: (string | undefined)[] = []
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('tool.call', { tool: 'Read' }, () => ({ deny: 'refused' }))
  on('tool.call', { tool: 'Edit' }, () => ANSWER)
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })
  await $.turn.start({ text: 'go', turnId: 't7' })

  for (let n = 0; n < 4; n += 1) {
    await read($)
    await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: `b${(id += 1)}` })
  }
  expect(status.every(text => text === undefined)).toBe(true)

  for (let n = 0; n < 4; n += 1) {
    await edit($)
  }
  expect(status.at(-1)).toBe('explore 0 reads · 4 edits · changing')
})

test('uses the singular for one read and one edit', async ($, on) => {
  const status = world(on)
  await $.turn.start({ text: 'go', turnId: 't8' })

  await read($)
  for (let n = 0; n < 3; n += 1) {
    await edit($)
  }

  expect(status.at(-1)).toBe('explore 1 read · 3 edits · changing')

  await $.turn.start({ text: 'go', turnId: 't9' })
  for (let n = 0; n < 3; n += 1) {
    await read($)
  }
  await edit($)
  expect(status.at(-1)).toBe('explore 3 reads · 1 edit · mixed')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  await $.turn.start({ text: 'go', turnId: 't10' })

  await read($)
  await read($)
  await edit($)
  await edit($)

  expect(status.at(-1)).toBe('explorar 2 lecturas · 2 ediciones · cambiando')
})
