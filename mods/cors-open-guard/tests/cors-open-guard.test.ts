import { expect, test } from 'claude-code/testing'

type Call = { tool: string; input: Record<string, string> }

const ASKED: readonly Call[] = [
  { tool: 'Edit', input: { file_path: 'src/server.ts', old_string: '', new_string: 'res.setHeader(\'Access-Control-Allow-Origin\', \'*\')' } },
  { tool: 'Edit', input: { file_path: 'src/server.ts', old_string: '', new_string: 'app.use(cors({ origin: \'*\' }))' } },
  { tool: 'Edit', input: { file_path: 'src/server.ts', old_string: '', new_string: 'app.use(cors())' } },
  { tool: 'Write', input: { file_path: 'src/Api.java', content: '@CrossOrigin\npublic class Api {}' } },
  { tool: 'Write', input: { file_path: 'app/main.py', content: 'app.add_middleware(CORSMiddleware, allow_origins=["*"])' } },
  { tool: 'Write', input: { file_path: 'nginx.conf', content: 'add_header Access-Control-Allow-Origin *;' } },
]

const FINE: readonly Call[] = [
  { tool: 'Edit', input: { file_path: 'src/server.ts', old_string: '', new_string: 'app.use(cors({ origin: \'https://app.example.com\' }))' } },
  { tool: 'Edit', input: { file_path: 'src/server.ts', old_string: '', new_string: 'res.setHeader(\'Access-Control-Allow-Origin\', origin)' } },
  { tool: 'Write', input: { file_path: 'src/Api.java', content: '@CrossOrigin(origins = "https://app.example.com")\npublic class Api {}' } },
  { tool: 'Write', input: { file_path: 'src/Web.java', content: 'registry.addMapping("/**").allowedOrigins("https://a.example.com");' } },
  { tool: 'Edit', input: { file_path: 'src/server.ts', old_string: '', new_string: 'app.use(cors({ origin: allowed }))' } },
  { tool: 'Write', input: { file_path: 'nginx.conf', content: 'add_header Access-Control-Allow-Origin https://a.example.com;' } },
  { tool: 'Edit', input: { file_path: 'src/server.ts', old_string: '', new_string: '// origin: "*" is not allowed' } },
]

test('asks before what it exists to catch', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const { tool, input } of ASKED) {
    const verdict = await $.tool.check({ tool, input })
    expect(verdict.decision, JSON.stringify(input)).toBe('ask')
    expect(verdict.reason, JSON.stringify(input)).toContain('cors-open-guard:')
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
    input: { file_path: 'src/server.ts', old_string: 'app.use(cors())', new_string: 'app.use(cors())\napp.use(json())' },
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
  expect(verdict.reason).toContain('abre o CORS para qualquer origem em src/server.ts')
})
