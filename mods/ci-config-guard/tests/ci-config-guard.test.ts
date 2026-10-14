import { expect, test } from 'claude-code/testing'

const ASKED = [
  '.github/workflows/deploy.yml',
  'C:\\proj\\.github\\workflows\\ci.yaml',
  '.gitlab-ci.yml',
  'azure-pipelines.yml',
  'api/Jenkinsfile',
  '.circleci/config.yml',
  'vercel.json',
  'netlify.toml',
  'app/eas.json',
]

const QUIET = ['src/index.ts', '.github/CODEOWNERS', 'docs/vercel.md', 'package.json', 'my-eas.json.bak']

test('asks before an edit or write on pipeline and deploy config', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const tool of ['Edit', 'Write']) {
    for (const file_path of ASKED) {
      const verdict = await $.tool.check({ tool, input: { file_path } })
      expect(verdict.decision, file_path).toBe('ask')
      expect(verdict.reason, file_path).toContain('ci-config-guard')
    }
  }
})

test('stays quiet on other files and tools', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const file_path of QUIET) {
    const verdict = await $.tool.check({ tool: 'Edit', input: { file_path } })
    expect(verdict.decision, file_path).toBe('allow')
  }

  const read = await $.tool.check({ tool: 'Read', input: { file_path: 'vercel.json' } })
  expect(read.decision).toBe('allow')
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const verdict = await $.tool.check({ tool: 'Edit', input: { file_path: 'vercel.json' } })
  expect(verdict.reason).toContain('configura o pipeline ou o deploy')
})
