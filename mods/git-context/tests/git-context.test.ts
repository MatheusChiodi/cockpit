import { expect, test } from 'claude-code/testing'

const ran = (exitCode: number, stdout: string) => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

const submit = (text: string, kind: 'composer' | 'api' = 'composer') =>
  ({ text, wait: false, origin: { kind } }) as never

test('adds the git state to a typed prompt as hidden context', async ($, on) => {
  let seen: readonly string[] | undefined
  on('process.run', () => ran(0, '## main...origin/main\n M a.ts\n?? b.ts\n'))
  on('prompt.submit', (_$, e) => {
    seen = e.context

    return { text: e.text }
  })

  await $.prompt.submit(submit('fix the bug'))
  expect(seen).toEqual(['Git state right now (main...origin/main):\n M a.ts\n?? b.ts'])
})

test('says the tree is clean and caps a long list', async ($, on) => {
  let seen: readonly string[] | undefined
  let stdout = '## main\n'
  on('process.run', () => ran(0, stdout))
  on('prompt.submit', (_$, e) => {
    seen = e.context

    return { text: e.text }
  })

  await $.prompt.submit(submit('go'))
  expect(seen?.[0]).toBe('Git state right now (main):\nclean tree')

  stdout = `## main\n${Array.from({ length: 25 }, (_, i) => `?? f${i}.ts`).join('\n')}\n`
  await $.prompt.submit(submit('go'))
  expect(seen?.[0]).toContain('?? f19.ts')
  expect(seen?.[0]).not.toContain('?? f20.ts')
  expect(seen?.[0]).toContain('… and 5 more')
})

test('leaves slash commands, other origins and non-repositories alone', async ($, on) => {
  let seen: readonly string[] | undefined = ['untouched']
  let exitCode = 0
  on('process.run', () => ran(exitCode, '## main\n'))
  on('prompt.submit', (_$, e) => {
    seen = e.context

    return { text: e.text }
  })

  await $.prompt.submit(submit('/clear'))
  expect(seen).toBeUndefined()

  await $.prompt.submit(submit('hello', 'api'))
  expect(seen).toBeUndefined()

  exitCode = 128
  await $.prompt.submit(submit('hello'))
  expect(seen).toBeUndefined()
})

test('keeps the context the prompt already carried', async ($, on) => {
  let seen: readonly string[] | undefined
  on('process.run', () => ran(0, '## main\n'))
  on('prompt.submit', (_$, e) => {
    seen = e.context

    return { text: e.text }
  })

  await $.prompt.submit({ ...(submit('hi') as object), context: ['earlier'] } as never)
  expect(seen).toHaveLength(2)
  expect(seen?.[0]).toBe('earlier')
})
