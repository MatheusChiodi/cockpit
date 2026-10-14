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
