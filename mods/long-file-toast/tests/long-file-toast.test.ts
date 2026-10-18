import { expect, test } from 'claude-code/testing'

const ANSWER = { result: undefined as never }

const lines = (count: number) => Array.from({ length: count }, (_, at) => `const a${at} = ${at}`).join('\n')

const setup = (on: any, size: () => number) => {
  const toasts: string[] = []
  on('tool.call', { tool: 'Edit' }, () => ANSWER)
  on('tool.call', { tool: 'Write' }, () => ANSWER)
  on('fs.read', () => ({ value: lines(size()) }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return toasts
}

const edit = (file_path: string, tool_use_id: string) =>
  ({ tool: 'Edit', file_path, old_string: 'x', new_string: 'y', tool_use_id }) as const

test('toasts when a file passes 500 lines, then at every 100 more', async ($, on) => {
  let size = 480
  const toasts = setup(on, () => size)

  await $.tool.call(edit('/repo/src/checkout.ts', 'e1'))
  expect(toasts).toEqual([])

  size = 512
  await $.tool.call(edit('/repo/src/checkout.ts', 'e2'))
  size = 540
  await $.tool.call(edit('/repo/src/checkout.ts', 'e3'))
  expect(toasts).toEqual(['checkout.ts is now 512 lines: consider splitting it'])

  size = 601
  await $.tool.call(edit('/repo/src/checkout.ts', 'e4'))
  expect(toasts).toHaveLength(2)
  expect(toasts[1]).toBe('checkout.ts is now 601 lines: consider splitting it')
})

test('works on a Write, and skips tests and files that are not code', async ($, on) => {
  const toasts = setup(on, () => 900)

  await $.tool.call({ tool: 'Write', file_path: 'C:\\repo\\big.py', content: 'x', tool_use_id: 'w1' })
  expect(toasts).toEqual(['big.py is now 900 lines: consider splitting it'])

  await $.tool.call(edit('/repo/src/big.test.ts', 'e1'))
  await $.tool.call(edit('/repo/docs/big.md', 'e2'))
  expect(toasts).toHaveLength(1)
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = setup(on, () => 700)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.tool.call(edit('/repo/src/other.ts', 'e1'))
  expect(toasts).toEqual(['other.ts agora tem 700 linhas: considere dividi-lo'])
})

test('says nothing for an edit that failed, was denied or a file it cannot read', async ($, on) => {
  const toasts: string[] = []
  let answer: object = { result: undefined, isError: true }
  let readable = true
  on('tool.call', { tool: 'Edit' }, () => answer as never)
  on('fs.read', () => (readable ? { value: lines(800) } : { deny: 'ENOENT' }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.tool.call(edit('/repo/src/a.ts', 'e1'))
  answer = { deny: 'no' }
  await $.tool.call(edit('/repo/src/a.ts', 'e2'))
  answer = ANSWER
  readable = false
  await $.tool.call(edit('/repo/src/a.ts', 'e3'))
  expect(toasts).toEqual([])
})

test('announces again after the file shrank below 500 and grew back', async ($, on) => {
  let size = 520
  const toasts = setup(on, () => size)

  await $.tool.call(edit('/repo/src/a.ts', 'e1'))
  size = 450
  await $.tool.call(edit('/repo/src/a.ts', 'e2'))
  size = 505
  await $.tool.call(edit('/repo/src/a.ts', 'e3'))
  expect(toasts).toEqual(['a.ts is now 520 lines: consider splitting it', 'a.ts is now 505 lines: consider splitting it'])
})

test('does not announce a file that shrank but stays long', async ($, on) => {
  let size = 720
  const toasts = setup(on, () => size)

  await $.tool.call(edit('/repo/src/a.ts', 'e1'))
  size = 610
  await $.tool.call(edit('/repo/src/a.ts', 'e2'))
  size = 790
  await $.tool.call(edit('/repo/src/a.ts', 'e3'))
  expect(toasts).toEqual(['a.ts is now 720 lines: consider splitting it'])
})

test('keeps each file on its own count and skips Java test classes', async ($, on) => {
  const toasts = setup(on, () => 650)

  await $.tool.call(edit('/repo/src/a.ts', 'e1'))
  await $.tool.call(edit('/repo/src/b.go', 'e2'))
  await $.tool.call(edit('/repo/src/OrderTest.java', 'e3'))
  await $.tool.call(edit('/repo/src/a.ts', 'e4'))
  expect(toasts).toEqual(['a.ts is now 650 lines: consider splitting it', 'b.go is now 650 lines: consider splitting it'])
})

test('speaks Spanish when the hub says so', async ($, on) => {
  const toasts = setup(on, () => 500)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.tool.call(edit('/repo/src/x.rb', 'e1'))
  expect(toasts).toEqual(['x.rb ahora tiene 500 líneas: considera dividirlo'])
})
