import { expect, test } from 'claude-code/testing'

const INPUT = { model: 'claude-test', promptModel: 'claude-test', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as never

// Paths are read relative to /work, whatever the separator.
const project = (on: any, files: Record<string, string>) => {
  const key = (path: string) => path.slice(path.indexOf('work') + 5).replace(/[^\w.-]+/g, '/')

  on('session.root', () => ({ value: '/work' }))
  on('fs.exists', (_: unknown, e: { path: string }) => ({ value: key(e.path) in files }))
  on('fs.read', (_: unknown, e: { path: string }) => (key(e.path) in files ? { value: files[key(e.path)] } : { deny: 'ENOENT' }))
  on('prompt.compose', () => ({ sections: [{ id: 'other', text: 'kept', scope: 'session' as const }] }))
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))
}

const composed = async ($: any): Promise<{ id: string; text: string }[]> => (await $.prompt.compose(INPUT)).sections

test('names the ORM, the provider, the schema and the migrations', async ($, on) => {
  project(on, {
    'package.json': JSON.stringify({ dependencies: { '@prisma/client': '5', pg: '8', express: '4' } }),
    'prisma/schema.prisma': 'generator client {\n  provider = "prisma-client-js"\n}\ndatasource db {\n  provider = "postgresql"\n  url = env("DATABASE_URL")\n}\n',
    'prisma/migrations': '',
  })

  const sections = await composed($)
  expect(sections.map(s => s.id)).toEqual(['other', 'data-layer-context:data'])

  const text = sections[1]!.text
  expect(text).toContain('- Stack: Prisma, PostgreSQL\n')
  expect(text).toContain('- Schema: prisma/schema.prisma')
  expect(text).toContain('- Migrations: prisma/migrations/')
  expect(text).not.toContain('express')
  expect(text).not.toContain('DATABASE_URL')
})

test('recognizes a Java project on Oracle with Flyway', async ($, on) => {
  project(on, {
    'pom.xml': '<artifactId>ojdbc8</artifactId><artifactId>spring-boot-starter-data-jpa</artifactId><artifactId>flyway-core</artifactId>',
    'src/main/resources/db/migration': '',
  })

  const text = (await composed($))[1]!.text
  expect(text).toContain('- Stack: Oracle, Spring Data JPA, Flyway')
  expect(text).toContain('- Migrations: src/main/resources/db/migration/')
})

test('reads once and refreshes after package.json is edited', async ($, on) => {
  const files: Record<string, string> = { 'package.json': JSON.stringify({ dependencies: { drizzle_x: '1', 'drizzle-orm': '1' } }) }
  project(on, files)

  expect((await composed($))[1]!.text).toContain('Drizzle')

  files['package.json'] = JSON.stringify({ dependencies: { typeorm: '1' } })
  expect((await composed($))[1]!.text).toContain('Drizzle')

  await $.tool.call({ tool: 'Edit', file_path: '/work/package.json', old_string: 'a', new_string: 'b', tool_use_id: 'e1' })
  expect((await composed($))[1]!.text).toContain('TypeORM')
})

test('adds nothing for a project with no database', async ($, on) => {
  project(on, { 'package.json': JSON.stringify({ dependencies: { react: '18' } }) })

  expect((await composed($)).map(s => s.id)).toEqual(['other'])
})

test('recognizes a Python project from requirements.txt, or pyproject.toml without it', async ($, on) => {
  project(on, { 'requirements.txt': 'SQLAlchemy==2.0\npsycopg[binary]\nalembic\n', 'migrations': '' })

  const text = (await composed($))[1]!.text
  expect(text).toContain('- Stack: SQLAlchemy, PostgreSQL, Alembic migrations')
  expect(text).toContain('- Migrations: migrations/')
  expect(text).not.toContain('- Schema:')
})

test('falls back to pyproject.toml when there is no requirements.txt', async ($, on) => {
  project(on, { 'pyproject.toml': '[project]\ndependencies = ["Django>=5"]\n' })

  expect((await composed($))[1]!.text).toContain('- Stack: Django ORM')
})

test('carries on past an invalid package.json and names an unknown provider as written', async ($, on) => {
  project(on, {
    'package.json': '{ not json',
    'prisma/schema.prisma': 'datasource db {\n  provider = "cockroachdb"\n}\n',
  })

  const text = (await composed($))[1]!.text
  expect(text).toContain('- Stack: cockroachdb')
  expect(text).toContain('- Schema: prisma/schema.prisma')
})

test('a Write to the schema refreshes; an edit of an unrelated file does not', async ($, on) => {
  const files: Record<string, string> = { 'prisma/schema.prisma': 'datasource db {\n  provider = "mysql"\n}\n' }
  project(on, files)
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))

  expect((await composed($))[1]!.text).toContain('- Stack: MySQL')

  files['prisma/schema.prisma'] = 'datasource db {\n  provider = "sqlite"\n}\n'
  await $.tool.call({ tool: 'Edit', file_path: '/work/src/mypackage.json', old_string: 'a', new_string: 'b', tool_use_id: 'e1' })
  expect((await composed($))[1]!.text).toContain('- Stack: MySQL')

  await $.tool.call({ tool: 'Write', file_path: '/work/prisma/schema.prisma', content: 'x', tool_use_id: 'w1' })
  expect((await composed($))[1]!.text).toContain('- Stack: SQLite')
})

test('lists every driver once and starts the section with its heading', async ($, on) => {
  project(on, {
    'package.json': JSON.stringify({ dependencies: { sqlite3: '5' }, devDependencies: { 'better-sqlite3': '9', mongoose: '8' } }),
  })

  const text = (await composed($))[1]!.text
  expect(text.split('\n')[0]).toBe('# Data layer')
  expect(text).toContain('- Stack: Mongoose, SQLite')
})
