import { expect, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const QUOTE = {
  command: 'quote',
  args: '',
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
}

test('quotes every line of the selection into the prompt', async ($, on) => {
  const filled: { text: string; mode: string }[] = []
  on('ui.selection', () => ({ value: { text: 'first\nsecond' } }))
  on('prompt.fill', ($, e) => {
    filled.push({ text: e.text, mode: e.mode })

    return { isFilled: true }
  })

  const answer = await $.command.run(QUOTE)
  expect(filled).toEqual([{ text: '> first\n> second\n\n', mode: 'insert' }])
  expect(answer.text).toBe('Selection quoted in the prompt.')
})

test('says so when nothing is selected or the prompt refuses', async ($, on) => {
  let selection: { text: string } | undefined
  let isFilled = true
  on('ui.selection', () => ({ value: selection }))
  on('prompt.fill', () => ({ isFilled }))

  expect((await $.command.run(QUOTE)).text).toContain('Nothing selected')

  selection = { text: '  \n ' }
  expect((await $.command.run(QUOTE)).text).toContain('Nothing selected')

  selection = { text: 'x' }
  isFilled = false
  expect((await $.command.run(QUOTE)).text).toBe('Could not write to the prompt right now.')
})

test('speaks the language set in the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  on('ui.selection', () => ({ value: undefined }))

  expect((await $.command.run(QUOTE)).text).toContain('Nada selecionado')
})
