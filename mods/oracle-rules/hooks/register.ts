import type { EngineInterface, Register } from 'claude-code'

const SECTION = {
  id: 'oracle-rules:rules',
  text: "# Oracle 11g rules\nWrite SQL that runs on Oracle 11g: limit rows with `ROWNUM` in a subquery, never `FETCH FIRST` or `LIMIT`.\nNo `IDENTITY` columns: use a sequence plus a `BEFORE INSERT` trigger.\nUse `VARCHAR2`, `NUMBER`, `DATE`; `NVL` and `DECODE` are available.\nAlways bind variables (`:name` / `?`), never concatenate values into SQL.\nUpserts use `MERGE`.",
  scope: 'session',
} as const

// Read once per module load: the stack does not change mid-session.
const cache: { on: boolean | undefined } = { on: undefined }

const read = async ($: EngineInterface, ...files: string[]): Promise<string> => {
  const root = await $.session.root()
  const texts = await Promise.all(files.map(file => $.fs.read(`${root}/${file}`).catch(() => '')))

  return texts.join('\n')
}

const has = async ($: EngineInterface, file: string): Promise<boolean> => $.fs.exists(`${await $.session.root()}/${file}`)

const depsOf = async ($: EngineInterface): Promise<Set<string>> => {
  try {
    const parsed = JSON.parse(await read($, 'package.json')) as { dependencies?: object; devDependencies?: object }

    return new Set([...Object.keys(parsed.dependencies ?? {}), ...Object.keys(parsed.devDependencies ?? {})])
  } catch {
    return new Set()
  }
}

const detect = async ($: EngineInterface): Promise<boolean> => {
  const build = await read($, 'pom.xml', 'build.gradle', 'build.gradle.kts')

  return /ojdbc/i.test(build) || (await depsOf($)).has('oracledb')
}

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    cache.on ??= await detect($)

    return cache.on ? { sections: [...composed.sections, SECTION] } : composed
  })
}
