import { expect, mock, test } from 'claude-code/testing'

const ok = (stdout: string, stderr = '') => ({
  value: { exitCode: 0, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})
const missing = { value: { exitCode: 127, stdout: '', stderr: 'not found', isStdoutTruncated: false, isStderrTruncated: false } }

const FACTS = { model: 'm', promptModel: 'm', surfaces: [], tools: [], outputStyle: null, traits: [] }

test('names the system, the shell and the tools that are installed', async ($, on) => {
  mock.env(on, { OS: 'Windows_NT', ComSpec: 'C:\\Windows\\System32\\cmd.exe' })
  on('prompt.compose', () => ({ sections: [] }))
  on('process.run', (_, e) => {
    const [tool = ''] = e.argv

    if (tool === 'node') return ok('v22.4.0\n')
    if (tool === 'python') return ok('Python 3.12.1\n')
    if (tool === 'java') return ok('', 'openjdk version "21.0.2" 2024-01-16\n')
    if (tool === 'git') return ok('git version 2.45.1.windows.1\n')

    return missing
  })

  const section = (await $.prompt.compose(FACTS)).sections.find(item => item.id === 'os-context:env')

  expect(section?.text).toContain('OS: Windows')
  expect(section?.text).toContain('Shell: cmd.exe')
  expect(section?.text).toContain('node 22.4.0, python 3.12.1, java 21.0.2, git 2.45.1')
})



test('names macOS from uname, the shell from SHELL, and falls back to python3', async ($, on) => {
  mock.env(on, { SHELL: '/bin/zsh' })
  on('prompt.compose', () => ({ sections: [] }))
  on('process.run', (_, e) => {
    const [tool = ''] = e.argv

    if (tool === 'uname') return ok('Darwin\n')
    if (tool === 'python3') return ok('Python 3.11.4\n')

    return missing
  })

  const text = (await $.prompt.compose(FACTS)).sections.find(item => item.id === 'os-context:env')?.text
  expect(text).toBe(['# Environment', 'OS: macOS', 'Shell: zsh', 'Installed: python 3.11.4', 'Write commands for this OS and shell.'].join('\n'))
})

test('says unknown with no uname and leaves out what it cannot find', async ($, on) => {
  mock.env(on, {})
  on('prompt.compose', () => ({ sections: [{ id: 'other', text: 'kept', scope: 'session' as const }] }))
  on('process.run', () => missing)

  const sections = (await $.prompt.compose(FACTS)).sections
  expect(sections.map(item => item.id)).toEqual(['other', 'os-context:env'])
  expect(sections[1]?.text).toBe(['# Environment', 'OS: unknown', 'Write commands for this OS and shell.'].join('\n'))
})

test('looks once and reuses the section for later prompts', async ($, on) => {
  let runs = 0
  mock.env(on, {})
  on('prompt.compose', () => ({ sections: [] }))
  on('process.run', (_, e) => {
    runs += 1

    return e.argv[0] === 'uname' ? ok('Linux\n') : missing
  })

  const first = (await $.prompt.compose(FACTS)).sections[0]?.text
  const seen = runs
  const second = (await $.prompt.compose(FACTS)).sections[0]?.text

  expect(first).toContain('OS: Linux')
  expect(second).toBe(first)
  expect(runs).toBe(seen)
})
