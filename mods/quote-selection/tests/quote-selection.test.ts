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

test('speaks Spanish when the hub is set to es', async ($, on) => {
  let isFilled = true
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  on('ui.selection', () => ({ value: { text: 'x' } }))
  on('prompt.fill', () => ({ isFilled }))

  expect((await $.command.run(QUOTE)).text).toBe('Selección citada en el prompt.')
  isFilled = false
  expect((await $.command.run(QUOTE)).text).toBe('No se pudo escribir en el prompt ahora.')
})

test('speaks Portuguese when the quote lands and when it fails', async ($, on) => {
  let isFilled = true
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  on('ui.selection', () => ({ value: { text: 'x' } }))
  on('prompt.fill', () => ({ isFilled }))

  expect((await $.command.run(QUOTE)).text).toBe('Seleção citada no prompt.')
  isFilled = false
  expect((await $.command.run(QUOTE)).text).toBe('Não foi possível escrever no prompt agora.')
})

test('quotes blank lines inside the selection too', async ($, on) => {
  const filled: string[] = []
  on('ui.selection', () => ({ value: { text: 'one\n\nthree' } }))
  on('prompt.fill', ($, e) => {
    filled.push(e.text)

    return { isFilled: true }
  })

  await $.command.run(QUOTE)
  expect(filled).toEqual(['> one\n> \n> three\n\n'])
})

test('does not touch the prompt when nothing is selected', async ($, on) => {
  let fills = 0
  on('ui.selection', () => ({ value: { text: '' } }))
  on('prompt.fill', () => {
    fills += 1

    return { isFilled: true }
  })

  await $.command.run(QUOTE)
  expect(fills).toBe(0)
})
