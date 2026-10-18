import { expect, test } from 'claude-code/testing'

type Call = { tool: string; input: Record<string, string> }

const ASKED: readonly Call[] = [
  { tool: 'Edit', input: { file_path: 'app/settings.py', old_string: '', new_string: 'DEBUG = True' } },
  { tool: 'Write', input: { file_path: 'server.py', content: 'app.run(host=\'0.0.0.0\', debug=True)' } },
  { tool: 'Write', input: { file_path: 'src/main/resources/application.properties', content: 'management.endpoints.web.exposure.include=*' } },
  { tool: 'Write', input: { file_path: '.env.production', content: 'NODE_ENV=development' } },
  { tool: 'Write', input: { file_path: 'config/prod.yml', content: 'debug: true' } },
]

const FINE: readonly Call[] = [
  { tool: 'Edit', input: { file_path: 'app/settings.py', old_string: '', new_string: 'DEBUG = False' } },
  { tool: 'Edit', input: { file_path: 'app/settings.py', old_string: '', new_string: 'DEBUG = os.environ.get(\'DEBUG\') == \'1\'' } },
  { tool: 'Write', input: { file_path: 'app/settings_dev.py', content: 'DEBUG = True' } },
  { tool: 'Write', input: { file_path: '.env.local', content: 'APP_DEBUG=true' } },
  { tool: 'Edit', input: { file_path: 'src/log.ts', old_string: '', new_string: 'logger.debug(\'x\')' } },
  { tool: 'Write', input: { file_path: 'server.py', content: 'app.run(host=\'0.0.0.0\')' } },
  { tool: 'Write', input: { file_path: 'config/prod.yml', content: 'debug: false' } },
  { tool: 'Write', input: { file_path: 'docs/setup.md', content: 'DEBUG = True' } },
  { tool: 'Write', input: { file_path: 'src/main/resources/application.properties', content: 'management.endpoints.web.exposure.include=health,info' } },
]

test('asks before what it exists to catch', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const { tool, input } of ASKED) {
    const verdict = await $.tool.check({ tool, input })
    expect(verdict.decision, JSON.stringify(input)).toBe('ask')
    expect(verdict.reason, JSON.stringify(input)).toContain('debug-flag-guard:')
  }
})

test('lets similar but legitimate work through', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const { tool, input } of FINE) {
    const verdict = await $.tool.check({ tool, input })
    expect(verdict.decision, JSON.stringify(input)).toBe('allow')
  }
})

test('counts only what the edit adds', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  const verdict = await $.tool.check({
    tool: 'Edit',
    input: { file_path: 'app/settings.py', old_string: 'DEBUG = True', new_string: 'DEBUG = True\nALLOWED_HOSTS = []' },
  })
  expect(verdict.decision).toBe('allow')
})

test('does not loosen a verdict that is already a deny', async ($, on) => {
  on('tool.check', () => ({ decision: 'deny', reason: 'blocked beneath' }))

  const { tool, input } = ASKED[0] as Call
  const verdict = await $.tool.check({ tool, input })
  expect(verdict.decision).toBe('deny')
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const { tool, input } = ASKED[0] as Call
  const verdict = await $.tool.check({ tool, input })
  expect(verdict.decision).toBe('ask')
  expect(verdict.reason).toContain('liga uma flag de debug em app/settings.py')
})

test('names what it found in the reason', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  const h2 = await $.tool.check({ tool: 'Write', input: { file_path: 'application.yml', content: 'spring.h2.console.enabled: true' } })
  expect(h2.reason).toContain('exposes every management endpoint or the H2 console in application.yml')

  const flask = await $.tool.check({ tool: 'Write', input: { file_path: 'Dockerfile', content: 'ENV FLASK_DEBUG=1' } })
  expect(flask.reason).toContain('turns a debug flag on in Dockerfile')

  const inspect = await $.tool.check({ tool: 'Edit', input: { file_path: 'package.json', old_string: '', new_string: '"start": "node --inspect=0.0.0.0 server.js"' } })
  expect(inspect.decision).toBe('ask')

  const prod = await $.tool.check({ tool: 'Write', input: { file_path: 'config/production.env', content: 'LOG_DEBUG=1' } })
  expect(prod.reason).toContain('a production file')
})

test('skips commented lines, tests and other tools', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const input of [
    { file_path: 'app/settings.py', content: '# DEBUG = True' },
    { file_path: 'app/settings.py', content: '  // app.run(debug=True)' },
    { file_path: 'tests/settings.py', content: 'DEBUG = True' },
    { file_path: 'app/settings.example.py', content: 'DEBUG = True' },
  ]) {
    expect((await $.tool.check({ tool: 'Write', input })).decision, input.content).toBe('allow')
  }

  expect((await $.tool.check({ tool: 'Bash', input: { command: 'echo DEBUG = True > settings.py' } })).decision).toBe('allow')
})

test('keeps an ask already made beneath with its own reason', async ($, on) => {
  on('tool.check', () => ({ decision: 'ask', reason: 'asked beneath' }))

  const { tool, input } = ASKED[0] as Call
  const verdict = await $.tool.check({ tool, input })
  expect(verdict.decision).toBe('ask')
  expect(verdict.reason).toBe('asked beneath')
})

test('speaks Spanish when the hub says so', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const verdict = await $.tool.check({ tool: 'Write', input: { file_path: '.env.production', content: 'NODE_ENV=development' } })
  expect(verdict.reason).toContain('define una bandera de debug o desarrollo en .env.production, un archivo de producción')
})
