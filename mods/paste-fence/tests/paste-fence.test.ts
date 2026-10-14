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
