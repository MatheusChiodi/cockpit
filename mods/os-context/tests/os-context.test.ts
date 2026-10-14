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


