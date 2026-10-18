import { expect, test } from 'claude-code/testing'

const ANSWER = { result: undefined as never }

const MIGRATIONS = [
  'prisma/migrations/20240101_init/migration.sql',
  'db/migrate/20240101120000_add_users.rb',
  'app/migrations/0001_initial.py',
  'C:\\proj\\migrations\\20240101_add_users.sql',
  'alembic/versions/ae1027a6acf_add_users.py',
  'src/main/resources/db/flyway/V2__add_users.sql',
]

const OTHERS = ['src/migrations.ts', 'app/migrations/__init__.py', 'docs/migrations/README.md', 'src/index.ts']

test('refuses editing an existing migration', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  for (const file_path of MIGRATIONS) {
    const answer = await $.tool.call({ tool: 'Edit', file_path, old_string: 'a', new_string: 'b', tool_use_id: `e-${file_path}` })
    expect(answer.deny, file_path).toContain('migration-guard blocked the edit')
  }
})

test('refuses overwriting a migration that exists, passes a new one', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ANSWER)
  on('fs.exists', (_, e) => ({ value: String(e.path).endsWith('20240101_old.rb') }))

  const old = await $.tool.call({ tool: 'Write', file_path: 'db/migrate/20240101_old.rb', content: 'x', tool_use_id: 'w-1' })
  expect(old.deny).toContain('migration-guard')

  const fresh = await $.tool.call({ tool: 'Write', file_path: 'db/migrate/20250101_new.rb', content: 'x', tool_use_id: 'w-2' })
  expect(fresh.deny).toBeUndefined()
})

test('lets other files through', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  for (const file_path of OTHERS) {
    const answer = await $.tool.call({ tool: 'Edit', file_path, old_string: 'a', new_string: 'b', tool_use_id: `o-${file_path}` })
    expect(answer.deny, file_path).toBeUndefined()
  }
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call({
    tool: 'Edit',
    file_path: 'db/migrate/20240101_a.rb',
    old_string: 'a',
    new_string: 'b',
    tool_use_id: 'pt-1',
  })
  expect(answer.deny).toContain('migration-guard bloqueou a edição')
})

test('refuses a Write over a migration when it cannot tell whether the file exists', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Write' }, () => {
    ran += 1

    return ANSWER
  })
  on('fs.exists', () => ({ deny: 'no access' }))

  const answer = await $.tool.call({ tool: 'Write', file_path: 'db/migrate/20240101_a.rb', content: 'x', tool_use_id: 'w-x' })
  expect(answer.deny).toBe('migration-guard: the check failed, edit refused.')
  expect(ran).toBe(0)
})

test('a Write outside the migrations never looks at the disk', async ($, on) => {
  let looked = 0
  on('tool.call', { tool: 'Write' }, () => ANSWER)
  on('fs.exists', () => {
    looked += 1

    return { value: true }
  })

  for (const file_path of OTHERS) {
    expect((await $.tool.call({ tool: 'Write', file_path, content: 'x', tool_use_id: `wo-${file_path}` })).deny, file_path).toBeUndefined()
  }

  expect(looked).toBe(0)
})

test('names the file and points to a new migration', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  const answer = await $.tool.call({
    tool: 'Edit',
    file_path: 'alembic/versions/1a2b_users.py',
    old_string: 'a',
    new_string: 'b',
    tool_use_id: 'n-1',
  })
  expect(answer.deny).toBe(
    'migration-guard blocked the edit: alembic/versions/1a2b_users.py is an existing migration, and applied migrations are append-only. Add a new migration file instead.',
  )
})

test('speaks Spanish when the hub says so', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ANSWER)
  on('fs.exists', () => ({ value: true }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Write', file_path: 'prisma/migrations/1/migration.sql', content: 'x', tool_use_id: 'es-1' })
  expect(answer.deny).toContain('migration-guard bloqueó la edición: prisma/migrations/1/migration.sql es una migración existente')
})
