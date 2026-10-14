import { expect, mock, test } from 'claude-code/testing'

const submit = (text: string, kind: 'composer' | 'sdk' = 'composer') => ({
  text,
  wait: false,
  origin: { kind } as { kind: 'composer' },
})

test('every typed prompt carries the local date, weekday, time and offset', async ($, on) => {
  mock.clock(on, { now: Date.parse('2026-10-13T14:05:00') })
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))

  const entered = await $.prompt.submit(submit('what is due tomorrow?'))
  const context = (entered.context ?? []).join('\n')

  expect(context).toMatch(/Current local time: (Sun|Mon|Tues|Wednes|Thurs|Fri|Satur)day \d{4}-\d{2}-\d{2} \d{2}:\d{2} \(UTC[+-]\d{2}:\d{2}\)/)
})

test('leaves slash commands alone', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))

  const entered = await $.prompt.submit(submit('/help'))

  expect(entered.context ?? []).toHaveLength(0)
})

