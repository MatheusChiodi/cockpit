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

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const verdict = await $.tool.check({ tool: 'Write', input: { file_path: '.gitlab-ci.yaml' } })
  expect(verdict).toEqual({ decision: 'ask', reason: 'ci-config-guard: .gitlab-ci.yaml configura el pipeline o el deploy. Confirma la edición.' })
})

test('names the path as given, and covers the yaml and Jenkinsfile variants', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const file_path of ['/repo/azure-pipelines.yaml', 'ci/Jenkinsfile.release', '/repo/.circleci/config.yaml']) {
    const verdict = await $.tool.check({ tool: 'Edit', input: { file_path } })
    expect(verdict.reason, file_path).toBe(`ci-config-guard: ${file_path} configures the pipeline or deploy. Confirm the edit.`)
  }
})

test('leaves files beside the configs alone', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const file_path of ['.github/workflows/sub/x.yml', '.circleci/orbs.yml', 'docs/.gitlab-ci.yml.md', 'src/netlify.tomlx']) {
    expect((await $.tool.check({ tool: 'Write', input: { file_path } })).decision, file_path).toBe('allow')
  }
})

test('keeps a verdict that already denies or asks, and passes an input without a path', async ($, on) => {
  on('tool.check', ($, e) =>
    (e.input as { file_path?: string }).file_path === 'vercel.json' ? { decision: 'deny', reason: 'beneath' } : { decision: 'allow' },
  )

  expect((await $.tool.check({ tool: 'Edit', input: { file_path: 'vercel.json' } })).decision).toBe('deny')
  expect((await $.tool.check({ tool: 'Edit', input: {} })).decision).toBe('allow')
})
