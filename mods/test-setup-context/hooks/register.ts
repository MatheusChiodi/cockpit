import type { EngineInterface, Register } from 'claude-code'

const DEPS: readonly (readonly [string, string])[] = [
  ['vitest', 'Vitest'],
  ['jest', 'Jest'],
  ['mocha', 'Mocha'],
  ['ava', 'AVA'],
  ['@playwright/test', 'Playwright'],
  ['cypress', 'Cypress'],
  ['@testing-library/react', 'Testing Library (React)'],
  ['@testing-library/react-native', 'Testing Library (React Native)'],
  ['supertest', 'Supertest'],
]

const FILES: readonly (readonly [string, string])[] = [
  ['pytest.ini', 'pytest'],
  ['conftest.py', 'pytest'],
  ['pom.xml', 'JUnit/Maven (mvn test)'],
  ['go.mod', 'go test'],
  ['Cargo.toml', 'cargo test'],
]

const FOLDERS = ['tests', 'test', '__tests__', 'e2e', 'spec', 'src/__tests__', 'src/test']
const NAMED = /^[\w.-]+?(\.(test|spec))\.\w+$/

// Read once per module load; an edit of package.json clears it.
// The section is read by the model only: English, not translated.
const cache: { text: string | undefined } = { text: undefined }

const WATCHED = /(^|[^\w.-])package\.json$/

const describe = async ($: EngineInterface): Promise<string> => {
  const root = await $.session.root()
  const found: string[] = []
  const manifest = await $.fs.read(`${root}/package.json`).catch(() => undefined)

  if (typeof manifest === 'string') {
    try {
      const parsed = JSON.parse(manifest) as { dependencies?: object; devDependencies?: object }
      const deps = new Set([...Object.keys(parsed.dependencies ?? {}), ...Object.keys(parsed.devDependencies ?? {})])
      found.push(...DEPS.filter(([name]) => deps.has(name)).map(([, label]) => label))
    } catch {
      // Invalid package.json: carry on with the marker files only.
    }
  }

  for (const [file, label] of FILES) {
    if (await $.fs.exists(`${root}/${file}`)) {
      found.push(label)
    }
  }

  const folders: string[] = []
  let pattern: string | undefined

  for (const folder of FOLDERS) {
    const entries = await $.fs.list(`${root}/${folder}`).catch(() => [])

    if (entries.length > 0) {
      folders.push(`${folder}/`)
      const named = entries.find(entry => entry.kind === 'file' && NAMED.test(entry.name))
      pattern ??= named === undefined ? undefined : `*${named.name.slice(named.name.indexOf('.'))}`
    }
  }

  if (found.length === 0 && folders.length === 0) {
    return ''
  }

  const lines = [
    found.length > 0 ? `- Framework: ${[...new Set(found)].join(', ')}` : undefined,
    folders.length > 0 ? `- Test folders: ${folders.join(', ')}` : undefined,
    pattern === undefined ? undefined : `- File naming: ${pattern}`,
  ]

  return `# Tests\n${lines.filter(line => line !== undefined).join('\n')}\n- New tests go next to these, in the same framework and naming.`
}

const forget = (path: string): void => {
  if (WATCHED.test(path)) {
    cache.text = undefined
  }
}

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    cache.text ??= await describe($)

    return cache.text === ''
      ? composed
      : { sections: [...composed.sections, { id: 'test-setup-context:tests', text: cache.text, scope: 'session' }] }
  })

  on('tool.call', { tool: 'Edit' }, async (_$, e, next) => {
    const ran = await next(e)
    forget(e.file_path)

    return ran
  })

  on('tool.call', { tool: 'Write' }, async (_$, e, next) => {
    const ran = await next(e)
    forget(e.file_path)

    return ran
  })
}
