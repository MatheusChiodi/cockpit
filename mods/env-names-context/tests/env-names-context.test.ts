import { expect, test } from 'claude-code/testing'

const INPUT = { model: 'claude-test', promptModel: 'claude-test', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as never

// Paths are read relative to /work, whatever the separator; the reads are recorded in `reads`.
const project = (on: any, files: Record<string, string>, reads: string[] = []) => {
  const key = (path: string) => path.slice(path.indexOf('work') + 5).replace(/[^\w.-]+/g, '/')

  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) => {
    reads.push(key(e.path))

    return key(e.path) in files ? { value: files[key(e.path)] } : { deny: 'ENOENT' }
  })
  on('prompt.compose', () => ({ sections: [{ id: 'other', text: 'kept', scope: 'session' as const }] }))
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))
}

const composed = async ($: any): Promise<{ id: string; text: string }[]> => (await $.prompt.compose(INPUT)).sections

test('lists the names from .env.example and never a value', async ($, on) => {
  const leak = `sk_live_${'a1B2'.repeat(8)}`
  project(on, {
    '.env.example': `# database\nDATABASE_URL=postgres://user:${leak}@db/app\nexport JWT_SECRET="${leak}"\nPORT=3000\nPORT=3001\n\nnot a variable\n`,
    '.env': `REAL_ONLY_NAME=${leak}`,
  })

  const sections = await composed($)
  expect(sections.map(s => s.id)).toEqual(['other', 'env-names-context:env'])

  const text = sections[1]!.text
  expect(text).toContain('DATABASE_URL, JWT_SECRET, PORT')
  expect(text).not.toContain(leak)
  expect(text).not.toContain('postgres://')
  expect(text).not.toContain('3000')
  expect(text).not.toContain('REAL_ONLY_NAME')
})

test('never opens the real .env file', async ($, on) => {
  const reads: string[] = []
  project(on, { '.env': 'SECRET=1' }, reads)

  expect((await composed($)).map(s => s.id)).toEqual(['other'])
  expect(reads).not.toContain('.env')
})

test('caps a long list and refreshes after the template is written', async ($, on) => {
  const files: Record<string, string> = {
    '.env.example': Array.from({ length: 45 }, (_, i) => `VAR_${String(i).padStart(2, '0')}=`).join('\n'),
  }
  project(on, files)

  expect((await composed($))[1]!.text).toContain('+5 more')

  files['.env.example'] = 'ONLY=1'
  expect((await composed($))[1]!.text).toContain('+5 more')

  await $.tool.call({ tool: 'Write', file_path: '/work/.env.example', content: 'x', tool_use_id: 'w1' })
  expect((await composed($))[1]!.text).toContain('ONLY')
})

test('falls back to the next template, and the first one found wins', async ($, on) => {
  project(on, { '.env.sample': 'FROM_SAMPLE=1', '.env.dist': 'FROM_DIST=1' })

  const text = (await composed($))[1]!.text
  expect(text).toBe(
    "# Environment variables the app expects (names only)\nFROM_SAMPLE\nRead them through the app's config; never print or hard-code their values.",
  )
})

test('reads example.env and Windows line endings', async ($, on) => {
  project(on, { 'example.env': 'API_KEY=\r\nAPI_URL=\r\n' })

  expect((await composed($))[1]!.text).toContain('\nAPI_KEY, API_URL\n')
})

test('an Edit of a template refreshes, an edit of another file does not', async ($, on) => {
  const files: Record<string, string> = { '.env.template': 'FIRST=' }
  project(on, files)
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))

  expect((await composed($))[1]!.text).toContain('FIRST')

  files['.env.template'] = 'SECOND='
  await $.tool.call({ tool: 'Edit', file_path: '/work/my.env.template', old_string: 'a', new_string: 'b', tool_use_id: 'e1' })
  await $.tool.call({ tool: 'Write', file_path: '/work/src/app.ts', content: 'x', tool_use_id: 'w1' })
  expect((await composed($))[1]!.text).toContain('FIRST')

  await $.tool.call({ tool: 'Edit', file_path: 'C:\\work\\.env.template', old_string: 'a', new_string: 'b', tool_use_id: 'e2' })
  expect((await composed($))[1]!.text).toContain('SECOND')
})

test('adds nothing when the template holds no names', async ($, on) => {
  project(on, { '.env.example': '# only comments\n\n=value\n1BAD=x\n' })

  expect((await composed($)).map(s => s.id)).toEqual(['other'])
})
