import { expect, mock, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'turbina',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

test('desliga e religa painéis, contando os ligados', async ($, on) => {
  mock.store(on)

  const one = await $.command.run(run('off git-band'))
  expect(one.text).toContain('git-band desligado. 39 de 40 painéis ligados')

  // Desligar de novo não conta duas vezes.
  const again = await $.command.run(run('off git-band'))
  expect(again.text).toContain('39 de 40 painéis ligados')

  const back = await $.command.run(run('on git-band'))
  expect(back.text).toContain('git-band ligado. 40 de 40 painéis ligados')

  const none = await $.command.run(run('off all'))
  expect(none.text).toContain('0 de 40 painéis ligados')

  const all = await $.command.run(run('on all'))
  expect(all.text).toContain('40 de 40 painéis ligados')
})

test('recusa painel desconhecido', async ($, on) => {
  mock.store(on)

  const answer = await $.command.run(run('off nao-existe'))
  expect(answer.text).toContain('Painel desconhecido')
})
