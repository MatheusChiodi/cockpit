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
