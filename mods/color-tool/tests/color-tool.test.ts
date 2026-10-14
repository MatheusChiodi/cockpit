import { expect, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'color',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

test('converts hex to rgb and hsl and grades the contrast', async ($, on) => {
  const copied: string[] = []
  on('ui.copy', (_, e) => {
    copied.push(e.text)

    return { value: { isCopied: true } }
  })

  const red = await $.command.run(run('#ff0000'))
  expect(red.text).toContain('rgb(255, 0, 0)')
  expect(red.text).toContain('hsl(0, 100%, 50%)')
  expect(red.text).toMatch(/vs white\s+4\.00:1\s+AA large/)
  expect(red.text).toMatch(/vs black\s+5\.25:1\s+AA/)
  expect(copied[0]).toBe('#ff0000')

  const white = await $.command.run(run('fff'))
  expect(white.text).toContain('#ffffff')
  expect(white.text).toMatch(/vs black\s+21\.00:1\s+AAA/)
  expect(white.text).toMatch(/vs white\s+1\.00:1\s+fail/)
})

test('reads rgb() and hsl() and converts them', async ($, on) => {
  on('ui.copy', () => ({ value: { isCopied: true } }))

  const rgb = await $.command.run(run('rgb(0, 128, 0)'))
  expect(rgb.text).toContain('#008000')
  expect(rgb.text).toContain('hsl(120, 100%, 25%)')

  const hsl = await $.command.run(run('hsl(120, 100%, 25%)'))
  expect(hsl.text).toContain('#008000')

  const wrapped = await $.command.run(run('hsl(-240 100% 50%)'))
  expect(wrapped.text).toContain('#00ff00')
})

test('prints the usage for something that is not a color', async ($, on) => {
  on('ui.selection', () => ({ value: undefined }))

  for (const bad of ['', 'banana', 'rgb(300, 0, 0)', '#12345', 'hsl(10, 50, 50)']) {
    expect((await $.command.run(run(bad))).text, bad).toContain('Usage: /color')
  }
})

test('speaks the language set in the hub', async ($, on) => {
  on('ui.copy', () => ({ value: { isCopied: true } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run('#000000'))).text).toContain('sobre branco')
})
