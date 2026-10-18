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

test('adds nothing when git cannot start', async ($, on) => {
  let seen: readonly string[] | undefined = ['untouched']
  on('process.run', () => {
    throw new Error('spawn git ENOENT')
  })
  on('prompt.submit', (_$, e) => {
    seen = e.context

    return { text: e.text }
  })

  const entered = await $.prompt.submit(submit('hello'))
  expect(seen).toBeUndefined()
  expect(entered.text).toBe('hello')
})

test('runs git status in porcelain form with the branch', async ($, on) => {
  const argvs: (readonly string[])[] = []
  on('process.run', (_$, e) => {
    argvs.push(e.argv)

    return ran(0, '## main\n')
  })
  on('prompt.submit', (_$, e) => ({ text: e.text }))

  await $.prompt.submit(submit('go'))
  expect(argvs).toEqual([['git', 'status', '--porcelain=v1', '--branch']])
})

test('lists exactly twenty files without a "more" line', async ($, on) => {
  let seen: readonly string[] | undefined
  on('process.run', () => ran(0, `## dev\n${Array.from({ length: 20 }, (_, i) => ` M f${i}.ts`).join('\n')}\n`))
  on('prompt.submit', (_$, e) => {
    seen = e.context

    return { text: e.text }
  })

  await $.prompt.submit(submit('go'))
  expect(seen?.[0]).toContain(' M f19.ts')
  expect(seen?.[0]).not.toContain('more')
})

test('keeps the prompt text as typed', async ($, on) => {
  on('process.run', () => ran(0, '## main\n M a.ts\n'))
  on('prompt.submit', (_$, e) => ({ text: e.text }))

  expect((await $.prompt.submit(submit('explain   this\nplease'))).text).toBe('explain   this\nplease')
})
