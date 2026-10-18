import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Stack = { java: boolean; oracle: boolean }

// Read once per module load: the stack does not change mid-session.
const cache: { stack: Stack | undefined } = { stack: undefined }

const BUILD_FILES = ['pom.xml', 'build.gradle', 'build.gradle.kts'] as const

const detect = async ($: EngineInterface): Promise<Stack> => {
  const root = await $.session.root()
  let java = false
  let oracle = false

  for (const file of BUILD_FILES) {
    const text = await $.fs.read(`${root}/${file}`).catch(() => undefined)

    if (typeof text === 'string') {
      java = true
      oracle = oracle || /\bojdbc/i.test(text)
    }
  }

  const manifest = await $.fs.read(`${root}/package.json`).catch(() => undefined)

  try {
    const parsed = JSON.parse(typeof manifest === 'string' ? manifest : '{}') as Record<string, object | undefined>
    oracle = oracle || 'oracledb' in { ...parsed.dependencies, ...parsed.devDependencies }
  } catch {
    // Invalid package.json: no Oracle driver detected there.
  }

  return { java, oracle }
}

const SOURCE = /\.sql$/i

const findingsIn = (_path: string, text: string): Finding[] =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, '')
    .split(';')
    .flatMap(statement => {
      if (/\bwhere\b|\bcurrent\s+of\b/i.test(statement)) {
        return []
      }

      const deleted = /\bdelete\s+from\s+("?[\w$#.]+"?)/i.exec(statement)?.[1]
      const updated = /(?:^|\s)update\s+("?[\w$#.]+"?)(?:\s+\w+)?\s+set\b/i.exec(statement)?.[1]

      return deleted !== undefined
        ? [{ key: `delete:${deleted.toLowerCase()}`, detail: `DELETE FROM ${deleted} without WHERE` }]
        : updated === undefined
          ? []
          : [{ key: `update:${updated.toLowerCase()}`, detail: `UPDATE ${updated} without WHERE` }]
    })

const note = (found: Finding[], path: string): string =>
  `sql-no-where-note: ${path} now has ${[...new Set(found.map(item => item.detail))].join(', ')}. With no WHERE the statement touches every row of the table, and in Oracle it only ends with a COMMIT or ROLLBACK. If every row is really meant, say so in a comment (TRUNCATE TABLE is faster for a delete and cannot be rolled back); otherwise add the WHERE and check the count first with SELECT COUNT(*) on the same condition.`

type Finding = { key: string; detail: string }

// What the edit adds: findings the file did not already have, matched by count.
const addedBy = (path: string, before: string, after: string): Finding[] => {
  const had = new Map<string, number>()

  for (const found of findingsIn(path, before)) {
    had.set(found.key, (had.get(found.key) ?? 0) + 1)
  }

  return findingsIn(path, after).filter(found => {
    const left = had.get(found.key) ?? 0

    if (left > 0) {
      had.set(found.key, left - 1)

      return false
    }

    return true
  })
}

const relative = async ($: EngineInterface, path: string): Promise<string> => {
  const root = (await $.session.root()).replaceAll('\\', '/')
  const slashed = path.replaceAll('\\', '/')

  return slashed.toLowerCase().startsWith(`${root.toLowerCase()}/`) ? slashed.slice(root.length + 1) : slashed
}

// The file before and after an Edit; the edit's own strings when the file cannot be read.
const afterEdit = (current: string | undefined, old: string, next: string, all: boolean | undefined): { before: string; after: string } =>
  typeof current === 'string'
    ? { before: current, after: all === true ? current.split(old).join(next) : current.replace(old, () => next) }
    : { before: old, after: next }

// The note for the model about what the edit added; undefined when it added nothing worth a note.
const judge = async ($: EngineInterface, path: string, before: string, after: string): Promise<string | undefined> => {
  cache.stack ??= await detect($)

  if (!cache.stack.oracle) {
    return undefined
  }

  const found = addedBy(path, before, after)
  const first = found[0]

  if (first === undefined) {
    return undefined
  }

  const shown = await relative($, path)
  $.ui.toast((await strings($)).told(first.detail, shown), { timeoutMs: 5000 })

  return note(found, shown)
}

export const register: Register = on => {
  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    if (!SOURCE.test(e.file_path)) {
      return next(e)
    }

    const current = await $.fs.read(e.file_path).catch(() => undefined)
    const ran = await next(e)

    if (ran.deny !== undefined || ran.isError === true) {
      return ran
    }

    const text = await judge($, e.file_path, typeof current === 'string' ? current : '', e.content)

    return text === undefined ? ran : { ...ran, context: [...(ran.context ?? []), text] }
  }).catch((_$, e, next) => next(e))

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    if (!SOURCE.test(e.file_path)) {
      return next(e)
    }

    const current = await $.fs.read(e.file_path).catch(() => undefined)
    const ran = await next(e)

    if (ran.deny !== undefined || ran.isError === true) {
      return ran
    }

    const { before, after } = afterEdit(typeof current === 'string' ? current : undefined, e.old_string, e.new_string, e.replace_all)
    const text = await judge($, e.file_path, before, after)

    return text === undefined ? ran : { ...ran, context: [...(ran.context ?? []), text] }
  }).catch((_$, e, next) => next(e))
}
