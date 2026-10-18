import { expect, test } from 'claude-code/testing'

test('expands ::fix and keeps the rest of the prompt', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))

  const entered = await $.prompt.submit({
    text: '::fix TypeError in login.ts',
    wait: false,
    origin: { kind: 'composer' },
  })
  expect(entered.text).toContain('root cause')
  expect(entered.text).toContain('TypeError in login.ts')
})

test('leaves a plain prompt and an unknown shortcut alone', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))

  for (const text of ['how do I rebase?', '::nothing here']) {
    const entered = await $.prompt.submit({ text, wait: false, origin: { kind: 'composer' } })
    expect(entered.text).toBe(text)
  }
})

const submit = ($: any, text: string) => $.prompt.submit({ text, wait: false, origin: { kind: 'composer' } })

test('a shortcut alone becomes its expansion only', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))

  expect((await submit($, '::review')).text).toBe(
    'Review the current diff looking for bugs, regressions and security risks. List them by severity.',
  )
  expect((await submit($, '::commit   ')).text).toBe('Commit the current changes with a message that follows the repository history.')
})

test('expands every shortcut, keeping a multi-line rest below a blank line', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))

  for (const name of ['fix', 'test', 'review', 'explain', 'refactor', 'doc', 'commit']) {
    const text = (await submit($, `::${name} line one\nline two`)).text
    expect(text, name).toMatch(/\n\nline one\nline two$/)
    expect(text, name).not.toContain('::')
  }
})

test('expands only at the very start and only in lower case', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))

  for (const text of ['please ::fix this', ' ::fix leading space', '::FIX loud', '::fixit glued']) {
    expect((await submit($, text)).text, text).toBe(text)
  }
})

test('/shortcuts lists every shortcut with its expansion', async ($, on) => {
  const answer = await $.command.run({ command: 'shortcuts', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  const lines = answer.text?.split('\n') ?? []

  expect(lines).toHaveLength(7)
  expect(lines[0]).toBe('::fix  →  Find the root cause of the error below, fix it and explain in one line what was wrong.')
  expect(lines.map(line => line.split('  ')[0])).toEqual(['::fix', '::test', '::review', '::explain', '::refactor', '::doc', '::commit'])
})

test('registers the command with a description in the hub language', async ($, on) => {
  const registered: string[] = []
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('command.register', (_: unknown, e: { name: string; description: string }) => {
    registered.push(e.description)

    return { value: { command: e.name } }
  })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start({ cwd: '/work', surface: null, isInteractive: true })
  expect(registered).toEqual(['Lista os atalhos de prompt (::fix, ::test, ::review...)'])
})
