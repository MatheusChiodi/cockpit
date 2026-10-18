import type { EngineInterface, Register } from 'claude-code'

const ORMS: readonly (readonly [string, string])[] = [
  ['@prisma/client', 'Prisma'],
  ['prisma', 'Prisma'],
  ['drizzle-orm', 'Drizzle'],
  ['typeorm', 'TypeORM'],
  ['sequelize', 'Sequelize'],
  ['mongoose', 'Mongoose'],
  ['knex', 'Knex'],
  ['kysely', 'Kysely'],
]

const DRIVERS: readonly (readonly [string, string])[] = [
  ['pg', 'PostgreSQL'],
  ['mysql2', 'MySQL'],
  ['better-sqlite3', 'SQLite'],
  ['sqlite3', 'SQLite'],
  ['mongodb', 'MongoDB'],
  ['oracledb', 'Oracle'],
  ['@supabase/supabase-js', 'Supabase'],
]

// Keywords of a Maven or Python manifest, matched case-insensitively.
const JVM: readonly (readonly [string, string])[] = [
  ['ojdbc', 'Oracle'],
  ['postgresql', 'PostgreSQL'],
  ['mysql-connector', 'MySQL'],
  ['spring-boot-starter-data-jpa', 'Spring Data JPA'],
  ['hibernate', 'Hibernate'],
  ['mybatis', 'MyBatis'],
  ['flyway', 'Flyway'],
  ['liquibase', 'Liquibase'],
]

const PY: readonly (readonly [string, string])[] = [
  ['sqlalchemy', 'SQLAlchemy'],
  ['django', 'Django ORM'],
  ['psycopg', 'PostgreSQL'],
  ['alembic', 'Alembic migrations'],
]

const PROVIDERS: Record<string, string> = { postgresql: 'PostgreSQL', mysql: 'MySQL', sqlite: 'SQLite', sqlserver: 'SQL Server', mongodb: 'MongoDB' }

const MIGRATIONS = ['prisma/migrations', 'drizzle', 'migrations', 'db/migrate', 'db/migrations', 'src/main/resources/db/migration']
const SCHEMAS = ['prisma/schema.prisma', 'drizzle.config.ts', 'schema.prisma', 'src/db/schema.ts']

// Read once per module load; an edit of a manifest or the schema clears it.
// The section is read by the model only: English, not translated.
const cache: { text: string | undefined } = { text: undefined }

const WATCHED = /(^|[^\w.-])(package\.json|pom\.xml|requirements\.txt|schema\.prisma)$/

const matching = (text: string, table: readonly (readonly [string, string])[]): string[] =>
  table.filter(([needle]) => text.toLowerCase().includes(needle)).map(([, label]) => label)

const describe = async ($: EngineInterface): Promise<string> => {
  const root = await $.session.root()
  const read = (name: string) => $.fs.read(`${root}/${name}`).catch(() => undefined)
  const found: string[] = []
  const manifest = await read('package.json')

  if (typeof manifest === 'string') {
    try {
      const parsed = JSON.parse(manifest) as { dependencies?: object; devDependencies?: object }
      const deps = new Set([...Object.keys(parsed.dependencies ?? {}), ...Object.keys(parsed.devDependencies ?? {})])
      found.push(...[...ORMS, ...DRIVERS].filter(([name]) => deps.has(name)).map(([, label]) => label))
    } catch {
      // Invalid package.json: carry on with the other files.
    }
  }

  const pom = await read('pom.xml')
  const python = (await read('requirements.txt')) ?? (await read('pyproject.toml'))
  found.push(...(typeof pom === 'string' ? matching(pom, JVM) : []), ...(typeof python === 'string' ? matching(python, PY) : []))

  const schema = await read('prisma/schema.prisma')
  const provider = typeof schema === 'string' ? /datasource[^{]*\{[^}]*provider\s*=\s*"(\w+)"/.exec(schema)?.[1] : undefined

  if (provider !== undefined) {
    found.push(PROVIDERS[provider] ?? provider)
  }

  const labels = [...new Set(found)]

  if (labels.length === 0) {
    return ''
  }

  const schemas: string[] = []
  const migrations: string[] = []

  for (const path of SCHEMAS) {
    if (await $.fs.exists(`${root}/${path}`)) {
      schemas.push(path)
    }
  }

  for (const path of MIGRATIONS) {
    if (await $.fs.exists(`${root}/${path}`)) {
      migrations.push(`${path}/`)
    }
  }

  return [
    '# Data layer',
    `- Stack: ${labels.join(', ')}`,
    schemas.length > 0 ? `- Schema: ${schemas.join(', ')}` : undefined,
    migrations.length > 0 ? `- Migrations: ${migrations.join(', ')}` : undefined,
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n')
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
      : { sections: [...composed.sections, { id: 'data-layer-context:data', text: cache.text, scope: 'session' }] }
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
