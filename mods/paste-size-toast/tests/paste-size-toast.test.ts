import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const send = (text: string, kind: 'composer' | 'plugin' = 'composer') => ({ text, wait: false, origin: { kind } as never })

// The world beneath the mod: the prompt goes through, and the toasts are recorded.
const world = (on: On) => {
  const toasts: string[] = []
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return toasts
}

const LOG = Array.from({ length: 500 }, (_, at) => `2026-01-01 12:00:00 INFO request ${at} handled in 12ms`).join('\n')

test('toasts the size of a very large prompt and still sends it', async ($, on) => {
  const toasts = world(on)

  const entered = await $.prompt.submit(send(`why is this slow?\n${LOG}`))

  expect(entered.text).toContain('why is this slow?')
  expect(toasts).toHaveLength(1)
  expect(toasts[0]).toMatch(/^Prompt is 501 lines, about \d+,\d00 tokens: trim the paste to the part that matters$/)
})

test('stays quiet for a normal prompt, a slash command and a prompt from a plugin', async ($, on) => {
  const toasts = world(on)

  await $.prompt.submit(send('rename this function'))
  await $.prompt.submit(send(`/review ${LOG}`))
  await $.prompt.submit(send(LOG, 'plugin'))

  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.prompt.submit(send(LOG))

  expect(toasts[0]).toMatch(/^O prompt tem 500 linhas, cerca de \d+\.\d00 tokens: enxugue o que colou/)
})

test('toasts from exactly 20,000 characters', async ($, on) => {
  const toasts = world(on)

  await $.prompt.submit(send('a'.repeat(19_999)))
  expect(toasts).toEqual([])

  await $.prompt.submit(send('a'.repeat(20_000)))
  expect(toasts).toEqual(['Prompt is 1 lines, about 5,000 tokens: trim the paste to the part that matters'])
})

test('rounds the tokens to the nearest hundred', async ($, on) => {
  const toasts = world(on)

  await $.prompt.submit(send('a'.repeat(20_199)))
  await $.prompt.submit(send('a'.repeat(20_200)))

  expect(toasts).toEqual([
    'Prompt is 1 lines, about 5,000 tokens: trim the paste to the part that matters',
    'Prompt is 1 lines, about 5,100 tokens: trim the paste to the part that matters',
  ])
})

test('sends the prompt unchanged', async ($, on) => {
  world(on)
  const text = `${'x'.repeat(25_000)}\nend`

  expect((await $.prompt.submit(send(text))).text).toBe(text)
})

test('speaks Spanish when the hub says so', async ($, on) => {
  const toasts = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.prompt.submit(send(LOG))

  expect(toasts[0]).toMatch(/^El prompt tiene 500 líneas, unos [\d.]+ tokens: recorta lo pegado a la parte que importa$/)
})
