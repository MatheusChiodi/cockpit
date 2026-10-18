import { expect, test } from 'claude-code/testing'

const send = (text: string) => ({ text, wait: false, origin: { kind: 'composer' } as const })

const LOG = [
  'TypeError: Cannot read properties of undefined',
  '    at render (/app/src/view.js:12:5)',
  '    at update (/app/src/view.js:30:9)',
  '    at run (/app/src/main.js:8:3)',
  '    at start (/app/src/main.js:21:1)',
  '    at boot (/app/src/index.js:4:1)',
].join('\n')

test('fences a long log block and keeps the sentences outside', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))

  const entered = await $.prompt.submit(send(`why does this crash?\n${LOG}\nthanks`))

  expect(entered.text).toBe(`why does this crash?\n\`\`\`\n${LOG}\n\`\`\`\nthanks`)
})

test('leaves prose, short blocks and already fenced prompts alone', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))

  const prompts = [
    'please rename this function\nand update the callers\nthen run the tests',
    'const a = 1;\nconst b = 2;\nconst c = 3;',
    `look:\n\`\`\`\n${LOG}\n\`\`\``,
    '/review',
  ]

  for (const text of prompts) {
    const entered = await $.prompt.submit(send(text))
    expect(entered.text).toBe(text)
  }
})

test('leaves prompts that do not come from the composer alone', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))

  for (const kind of ['bridge', 'sdk'] as const) {
    const entered = await $.prompt.submit({ text: LOG, wait: false, origin: { kind } })
    expect(entered.text, kind).toBe(LOG)
  }
})

test('fences exactly six code lines but not five', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))

  const six = ['const a = 1;', 'const b = 2;', 'const c = 3;', 'const d = 4;', 'const e = 5;', 'const f = 6;']
  const fenced = await $.prompt.submit(send(six.join('\n')))
  expect(fenced.text).toBe(`\`\`\`\n${six.join('\n')}\n\`\`\``)

  const five = six.slice(0, 5).join('\n')
  const kept = await $.prompt.submit(send(five))
  expect(kept.text).toBe(five)
})

test('fences two separate blocks split by a sentence', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))

  const entered = await $.prompt.submit(send(`${LOG}\nand also this one\n${LOG}`))

  expect(entered.text).toBe(`\`\`\`\n${LOG}\n\`\`\`\nand also this one\n\`\`\`\n${LOG}\n\`\`\``)
})

test('a blank line breaks a block in two short runs that stay unfenced', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))

  const text = 'const a = 1;\nconst b = 2;\nconst c = 3;\n\nconst d = 4;\nconst e = 5;\nconst f = 6;'
  const entered = await $.prompt.submit(send(text))

  expect(entered.text).toBe(text)
})

test('fences a timestamped log of six lines', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))

  const log = Array.from({ length: 6 }, (_, i) => `2026-10-18 10:0${i}:00 server started worker ${i}`).join('\n')
  const entered = await $.prompt.submit(send(`see:\n${log}`))

  expect(entered.text).toBe(`see:\n\`\`\`\n${log}\n\`\`\``)
})
