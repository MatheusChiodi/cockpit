import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine, MockClock } from 'claude-code/testing'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const DONE = { answer: '', durationMs: 5000, isAborted: false, turnId: 't-1', reason: 'answer' } as const
const MINUTE = 60000
const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

// The world beneath the mod: edits and shell calls succeed (unless the command says `fail`), and every toast is recorded.
const world = (on: On, toasts: string[]) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('tool.call', { tool: 'Write' }, () => ANSWER)
  on('tool.call', { tool: 'Bash' }, (_$, e) => (e.command.includes('fail') ? { ...ANSWER, isError: true as const } : ANSWER))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
}

const edits = async ($: Engine, count: number) => {
  for (let i = 0; i < count; i += 1) {
    await $.tool.call({ tool: 'Write', file_path: `/project/f${i}.ts`, content: 'x', tool_use_id: `w-${i}` })
  }
}

const bash = ($: Engine, command: string) => $.tool.call({ tool: 'Bash', command, tool_use_id: command })

// Twenty edits now, one more turn after `minutes`.
const stretch = async ($: Engine, clock: MockClock, minutes: number, count = 20) => {
  await edits($, count)
  await clock.advance(minutes * MINUTE)
  await $.turn.complete(DONE)
}

test('speaks once after 20 edits and an hour without a commit', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await stretch($, clock, 64)
  expect(toasts).toEqual(['20 edits and 1h 04m without a commit. A good moment to save a checkpoint.'])

  await edits($, 5)
  await $.turn.complete(DONE)
  expect(toasts).toHaveLength(1)
})

test('stays quiet with few edits, or under an hour', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await stretch($, clock, 90, 19)
  expect(toasts).toEqual([])

  await clock.advance(1)
  await $.session.start(START)
  await stretch($, clock, 59)
  expect(toasts).toEqual([])
})

test('a commit starts the stretch over; a failed commit does not', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await edits($, 20)
  await clock.advance(70 * MINUTE)
  await bash($, 'git commit -m fail')
  await $.turn.complete(DONE)
  expect(toasts).toHaveLength(1)

  await bash($, 'git -c user.name=x commit -m done')
  await stretch($, clock, 70)
  expect(toasts).toHaveLength(2)

  await stretch($, clock, 70)
  expect(toasts).toHaveLength(2)
})

test('speaks the language set in the hub', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  await stretch($, clock, 75)

  expect(toasts).toEqual(['20 edições e 1h 15m sem commit. Bom momento para salvar um ponto de retorno.'])
})
