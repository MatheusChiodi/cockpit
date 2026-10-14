import { expect, mock, test } from 'claude-code/testing'

const NOW = Date.parse('2024-03-01T12:00:00Z')

const run = (args: string) => ({
  command: 'ts',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

test('shows now in four forms with no argument', async ($, on) => {
  mock.clock(on, { now: NOW })

  const answer = await $.command.run(run(''))
  expect(answer.text).toMatch(/seconds\s+1709294400\n/)
  expect(answer.text).toMatch(/millis\s+1709294400000\n/)
  expect(answer.text).toMatch(/iso 8601\s+2024-03-01T12:00:00.000Z\n/)
  expect(answer.text).toContain('local')
  expect(answer.text).toContain('now')
})

test('converts an epoch in seconds and in milliseconds', async ($, on) => {
  mock.clock(on, { now: NOW })

  const seconds = await $.command.run(run('1700000000'))
  expect(seconds.text).toContain('2023-11-14T22:13:20.000Z')
  expect(seconds.text).toContain('Read as seconds.')
  expect(seconds.text).toContain('ago')

  const millis = await $.command.run(run('1700000000000'))
  expect(millis.text).toContain('2023-11-14T22:13:20.000Z')
  expect(millis.text).toMatch(/seconds\s+1700000000\n/)
  expect(millis.text).toContain('Read as milliseconds.')
})

test('converts a date', async ($, on) => {
  mock.clock(on, { now: NOW })

  const answer = await $.command.run(run('2024-03-02T12:00:00Z'))
  expect(answer.text).toMatch(/seconds\s+1709380800\n/)
  expect(answer.text).toContain('in 1d 0h')
})

test('prints the usage for something that is not a moment', async ($, on) => {
  mock.clock(on, { now: NOW })

  const answer = await $.command.run(run('banana'))
  expect(answer.text).toContain('Usage: /ts')
})

test('speaks the language set in the hub', async ($, on) => {
  mock.clock(on, { now: NOW })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.command.run(run('1700000000'))
  expect(answer.text).toContain('Lido como segundos.')
  expect(answer.text).toContain('relativo')
  expect(answer.text).toContain('há ')
})
