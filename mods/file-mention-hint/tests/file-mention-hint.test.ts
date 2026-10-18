import { expect, test } from 'claude-code/testing'

const send = (text: string) => ({ text, wait: false, origin: { kind: 'composer' } as const })

const TRACKED = ['src/app/login.ts', 'src/old/login.ts', 'src/util.ts', 'README.md'].join('\n')

const LS = {
  value: { exitCode: 0, stdout: `${TRACKED}\n`, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
}

test('adds the tracked paths of a bare file name', async ($, on) => {
  on('process.run', () => LS)
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))

  const entered = await $.prompt.submit(send('fix the bug in login.ts please'))
  const context = (entered.context ?? []).join('\n')

  expect(context).toContain('- src/app/login.ts')
  expect(context).toContain('- src/old/login.ts')
  expect(context).not.toContain('util.ts')
})

test('ignores @mentions, paths, unknown files and slash commands', async ($, on) => {
  on('process.run', () => LS)
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))

  for (const text of ['look at @login.ts', 'open src/app/login.ts', 'what is missing.ts?', '/login.ts']) {
    const entered = await $.prompt.submit(send(text))
    expect(entered.context ?? [], text).toHaveLength(0)
  }
})



test('lists at most five paths, keeping the context already there', async ($, on) => {
  const many = Array.from({ length: 8 }, (_, i) => `pkg${i}/index.ts`).join('\n')
  on('process.run', () => ({ value: { ...LS.value, stdout: many } }))
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))

  const entered = await $.prompt.submit({ ...send('why does index.ts fail'), context: ['earlier'] })
  const context = entered.context ?? []

  expect(context[0]).toBe('earlier')
  expect(context[1]).toBe(
    ['Files matching names in the prompt (open these first):', ...[0, 1, 2, 3, 4].map(i => `- pkg${i}/index.ts`)].join('\n'),
  )
})

test('finds names in quotes, parentheses and at the end of a sentence', async ($, on) => {
  on('process.run', () => LS)
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))

  for (const text of ['check "util.ts" now', 'see (util.ts)', 'the bug is in util.ts.', 'util.ts: what is wrong?']) {
    const entered = await $.prompt.submit(send(text))
    expect((entered.context ?? []).join('\n'), text).toContain('- src/util.ts')
  }
})

test('leaves prompts that do not come from the composer alone', async ($, on) => {
  let runs = 0
  on('process.run', () => {
    runs += 1

    return LS
  })
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))

  const entered = await $.prompt.submit({ text: 'fix login.ts', wait: false, origin: { kind: 'sdk' } } as never)
  expect(entered.context ?? []).toHaveLength(0)
  expect(runs).toBe(0)
})

test('adds nothing when git cannot list the files, and never asks git without a name', async ($, on) => {
  let answer: any = { value: { ...LS.value, exitCode: 128, stdout: '' } }
  let runs = 0
  on('process.run', () => {
    runs += 1

    return answer
  })
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))

  expect((await $.prompt.submit(send('fix login.ts'))).context ?? []).toHaveLength(0)
  answer = { deny: 'spawn git ENOENT' }
  expect((await $.prompt.submit(send('fix login.ts'))).context ?? []).toHaveLength(0)

  runs = 0
  await $.prompt.submit(send('just a question with no file'))
  expect(runs).toBe(0)
})
