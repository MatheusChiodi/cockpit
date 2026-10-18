import { expect, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const run = (command: string) => ({
  command,
  args: '',
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const message = (role: 'user' | 'assistant', text: string) => ({ role, text, toolUses: [] })

const ANSWER = ['Here:', '```ts', 'const a = 1', '```', 'and then:', '```', 'echo hi', '```', 'done'].join('\n')

test('copies the last assistant reply, skipping empty ones', async ($, on) => {
  const copies: string[] = []
  on('session.messages', () => ({
    value: [message('assistant', 'old'), message('user', 'q'), message('assistant', 'the reply'), message('assistant', '  ')],
  }))
  on('ui.copy', ($, e) => {
    copies.push(e.text)

    return { value: { isCopied: true } }
  })

  const answer = await $.command.run(run('copy-last'))
  expect(copies).toEqual(['the reply'])
  expect(answer.text).toBe('Reply copied (9 characters).')
})

test('copy-code copies only the last fenced block', async ($, on) => {
  const copies: string[] = []
  on('session.messages', () => ({ value: [message('assistant', ANSWER)] }))
  on('ui.copy', ($, e) => {
    copies.push(e.text)

    return { value: { isCopied: true } }
  })

  const answer = await $.command.run(run('copy-code'))
  expect(copies).toEqual(['echo hi'])
  expect(answer.text).toBe('Code copied (7 characters).')
})

test('says so when there is nothing to copy or no clipboard', async ($, on) => {
  let messages = [message('user', 'hi')]
  on('session.messages', () => ({ value: messages }))
  on('ui.copy', () => ({ value: { isCopied: false, reason: 'no-clipboard' } }))

  expect((await $.command.run(run('copy-last'))).text).toBe('There is no reply to copy yet.')
  expect((await $.command.run(run('copy-code'))).text).toBe('The last reply has no code block.')

  messages = [message('assistant', 'no code here')]
  expect((await $.command.run(run('copy-code'))).text).toBe('The last reply has no code block.')
  expect((await $.command.run(run('copy-last'))).text).toBe('The clipboard is not reachable on this surface.')
})

test('speaks the language set in the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  on('session.messages', () => ({ value: [message('assistant', ANSWER)] }))
  on('ui.copy', () => ({ value: { isCopied: true } }))

  expect((await $.command.run(run('copy-code'))).text).toBe('Código copiado (7 caracteres).')
  expect((await $.command.run(run('copy-last'))).text).toContain('Resposta copiado')
})

test('copy-code keeps the lines of a block and drops only its final newline', async ($, on) => {
  const copies: string[] = []
  on('session.messages', () => ({ value: [message('assistant', 'See:\n```python\ndef f():\n    return 1\n\n```\n')] }))
  on('ui.copy', (_$, e) => {
    copies.push(e.text)

    return { value: { isCopied: true } }
  })

  await $.command.run(run('copy-code'))
  expect(copies).toEqual(['def f():\n    return 1\n'])
})

test('copy-code looks only at the last reply and ignores an unclosed fence', async ($, on) => {
  on('session.messages', () => ({
    value: [message('assistant', '```\nold block\n```'), message('user', 'next'), message('assistant', 'start:\n```js\nnever closed')],
  }))
  on('ui.copy', () => ({ value: { isCopied: true } }))

  expect((await $.command.run(run('copy-code'))).text).toBe('The last reply has no code block.')
})

test('copy-code says so when the clipboard is out of reach', async ($, on) => {
  on('session.messages', () => ({ value: [message('assistant', ANSWER)] }))
  on('ui.copy', () => ({ value: { isCopied: false, reason: 'no-clipboard' } }))

  expect((await $.command.run(run('copy-code'))).text).toBe('The clipboard is not reachable on this surface.')
})

test('speaks Spanish when the hub says so', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  let messages = [message('user', 'hola')]
  let isCopied = true
  on('session.messages', () => ({ value: messages }))
  on('ui.copy', () => ({ value: isCopied ? { isCopied: true } : { isCopied: false, reason: 'no-clipboard' } }))

  expect((await $.command.run(run('copy-last'))).text).toBe('Todavía no hay respuesta para copiar.')
  expect((await $.command.run(run('copy-code'))).text).toBe('La última respuesta no tiene bloque de código.')

  messages = [message('assistant', ANSWER)]
  expect((await $.command.run(run('copy-code'))).text).toBe('Código copiado (7 caracteres).')
  isCopied = false
  expect((await $.command.run(run('copy-last'))).text).toBe('No se pudo acceder al portapapeles en esta superficie.')
})

test('Portuguese answers when there is nothing to copy', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  on('session.messages', () => ({ value: [] }))

  expect((await $.command.run(run('copy-last'))).text).toBe('Ainda não há resposta para copiar.')
  expect((await $.command.run(run('copy-code'))).text).toBe('A última resposta não tem bloco de código.')
})
