import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const MIGRATIONS = [
  /(?:^|\/)prisma\/migrations\/.+/,
  /(?:^|\/)db\/migrate\/.+/,
  // A numbered file in a migrations folder: a timestamp or sequence prefix.
  /(?:^|\/)migrations\/(?:[^/]+\/)*\d[^/]*$/,
  /(?:^|\/)alembic\/versions\/.+/,
  /(?:^|\/)(?:flyway|db\/migration)\/(?:[^/]+\/)*V[^/]*__[^/]*\.sql$/,
]

const isMigration = (path: string): boolean => MIGRATIONS.some(pattern => pattern.test(path.replace(/\\/g, '/')))

const refusal = async ($: EngineInterface, path: string): Promise<string> => (await strings($)).blocked(path)

export const register: Register = on => {
  on('tool.call', { tool: 'Edit' }, async ($, e, next) =>
    isMigration(e.file_path) ? { deny: await refusal($, e.file_path) } : next(e),
  ).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))

  // A new migration is the fix: Write passes while the file does not exist yet.
  on('tool.call', { tool: 'Write' }, async ($, e, next) =>
    isMigration(e.file_path) && (await $.fs.exists(e.file_path)) ? { deny: await refusal($, e.file_path) } : next(e),
  ).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))
}
