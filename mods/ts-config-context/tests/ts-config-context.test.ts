import { expect, test } from 'claude-code/testing'

const INPUT = { model: 'claude-test', promptModel: 'claude-test', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as never

// The project's files by name, read live from `files`; the sections beneath come from `below`.
const project = (on: any, files: Record<string, string>, below: { id: string; text: string; scope: 'session' }[] = []) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) => {
    const name = e.path.replaceAll('\\', '/').split('/').pop() ?? ''

    return name in files ? { value: files[name] } : { deny: 'ENOENT' }
  })
  on('prompt.compose', () => ({ sections: below }))
}

const composed = async ($: any): Promise<{ id: string; text: string; scope: string }[]> =>
  (await $.prompt.compose(INPUT)).sections

test('tells the model the strict flags, module settings and path aliases', async ($, on) => {
  project(on, {
    'tsconfig.json': `{
      // comments are legal in a tsconfig
      "compilerOptions": {
        "strict": true,
        "noUncheckedIndexedAccess": true,
        "verbatimModuleSyntax": true,
        "moduleResolution": "NodeNext",
        "paths": { "@/*": ["./src/*"], },
      },
    }`,
  })

  const sections = await composed($)
  expect(sections.map(section => section.id)).toEqual(['ts-config-context:tsconfig'])

  const text = sections[0]!.text
  expect(text).toContain('# TypeScript configuration (tsconfig.json)')
  expect(text).toContain('strict mode is on')
  expect(text).toContain('noUncheckedIndexedAccess is on')
  expect(text).toContain('must use `import type`')
  expect(text).toContain('relative imports need the `.js` extension')
  expect(text).toContain('Path aliases: @/* -> ./src/*.')
  expect(text).not.toContain('exactOptionalPropertyTypes')
  expect(sections[0]!.scope).toBe('session')
})

test('follows a relative extends and lets the child override it', async ($, on) => {
  project(on, {
    'tsconfig.json': `{ "extends": "./tsconfig.base.json", "compilerOptions": { "strict": false } }`,
    'tsconfig.base.json': `{ "compilerOptions": { "strict": true, "moduleResolution": "bundler" } }`,
  })

  const text = (await composed($))[0]!.text
  expect(text).not.toContain('strict mode is on')
  expect(text).toContain('moduleResolution is bundler')
})

test('keeps the sections beneath and reads the tsconfig only once', async ($, on) => {
  const files: Record<string, string> = { 'tsconfig.json': `{ "compilerOptions": { "strict": true } }` }
  project(on, files, [{ id: 'other', text: 'kept', scope: 'session' }])

  const first = await composed($)
  expect(first.map(section => section.id)).toEqual(['other', 'ts-config-context:tsconfig'])

  files['tsconfig.json'] = `{ "compilerOptions": { "moduleResolution": "bundler" } }`
  const second = await composed($)
  expect(second[1]!.text).toContain('strict mode is on')
  expect(second[1]!.text).not.toContain('bundler')
})

test('adds nothing without a tsconfig or with nothing worth saying', async ($, on) => {
  project(on, { 'package.json': '{}' })
  expect(await composed($)).toEqual([])
})

test('adds nothing for a tsconfig that sets none of the options', async ($, on) => {
  project(on, { 'tsconfig.json': `{ "compilerOptions": { "target": "es2022" } }` })
  expect(await composed($)).toEqual([])
})
