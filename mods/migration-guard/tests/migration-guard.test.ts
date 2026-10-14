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
