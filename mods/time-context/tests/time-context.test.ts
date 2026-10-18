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


test('writes the weekday, date and time of the clock with zero padding', async ($, on) => {
  const now = new Date(2026, 0, 4, 9, 7)
  mock.clock(on, { now: now.getTime() })
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))

  const entered = await $.prompt.submit(submit('plan the week'))
  expect(entered.context?.[0]).toMatch(/^Current local time: Sunday 2026-01-04 09:07 \(UTC[+-]\d{2}:\d{2}\)\. Resolve relative dates against it\.$/)
})

test('keeps the context the prompt already carries', async ($, on) => {
  mock.clock(on, { now: Date.parse('2026-10-13T14:05:00') })
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))

  const entered = await $.prompt.submit({ ...submit('and tomorrow?'), context: ['earlier note'] } as never)
  expect(entered.context?.[0]).toBe('earlier note')
  expect(entered.context?.[1]).toContain('Current local time:')
})

test('leaves prompts that did not come from the composer alone', async ($, on) => {
  mock.clock(on, { now: Date.parse('2026-10-13T14:05:00') })
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))

  const entered = await $.prompt.submit(submit('scheduled job', 'sdk'))
  expect(entered.context ?? []).toHaveLength(0)
})
