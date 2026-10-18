import { expect, test } from 'claude-code/testing'

const submit = (text: string, kind: 'composer' | 'sdk' = 'composer') =>
  ({ text, wait: false, origin: { kind } }) as const

const TRACES = [
  'TypeError: x is undefined\n    at render (/app/src/ui.js:10:5)\n    at run (node:internal/x:1:1)',
  'Traceback (most recent call last):\n  File "app.py", line 3, in <module>\nValueError',
  'Exception in thread "main" java.lang.NullPointerException\n\tat com.acme.Service.run(Service.java:42)',
  'System.NullReferenceException\n   at Acme.Run() in C:\\src\\Run.cs:line 12',
]

test('adds hidden context for each trace shape', async ($, on) => {
  on('prompt.submit', (_$, e) => ({ text: e.text, context: e.context }))

  for (const text of TRACES) {
    const entered = await $.prompt.submit(submit(text))
    expect(entered.context?.join('\n'), text).toContain('first frame inside this project')
  }
})

test('leaves plain prompts and non-composer origins alone', async ($, on) => {
  on('prompt.submit', (_$, e) => ({ text: e.text, context: e.context }))

  const plain = await $.prompt.submit(submit('how do I rebase?'))
  expect(plain.context).toBeUndefined()

  const sdk = await $.prompt.submit(submit(TRACES[0] ?? "", 'sdk'))
  expect(sdk.context).toBeUndefined()
})

test('keeps the context already there and the text as typed', async ($, on) => {
  on('prompt.submit', (_$, e) => ({ text: e.text, context: e.context }))

  const entered = await $.prompt.submit({ ...submit(TRACES[1] ?? ''), context: ['from another mod'] })
  expect(entered.text).toBe(TRACES[1])
  expect(entered.context?.[0]).toBe('from another mod')
  expect(entered.context).toHaveLength(2)
})

test('adds the context once even when the prompt holds several traces', async ($, on) => {
  on('prompt.submit', (_$, e) => ({ text: e.text, context: e.context }))

  const entered = await $.prompt.submit(submit(TRACES.join('\n\n')))
  expect(entered.context).toHaveLength(1)
})

test('does not take prose that mentions a line or an "at" for a trace', async ($, on) => {
  on('prompt.submit', (_$, e) => ({ text: e.text, context: e.context }))

  for (const text of [
    'look at src/app.ts:12 please',
    'the error is at line 3 of File "app.py"',
    'meet at 10:30',
    'Traceback without the header',
  ]) {
    expect((await $.prompt.submit(submit(text))).context, text).toBeUndefined()
  }
})

test('leaves prompts from notifications and other agents alone', async ($, on) => {
  on('prompt.submit', (_$, e) => ({ text: e.text, context: e.context }))

  for (const kind of ['task-notification', 'peer', 'auto-continuation'] as const) {
    const entered = await $.prompt.submit({ text: TRACES[0] ?? '', wait: false, origin: { kind } } as never)
    expect(entered.context, kind).toBeUndefined()
  }
})
