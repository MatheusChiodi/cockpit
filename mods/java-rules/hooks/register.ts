import type { EngineInterface, Register } from 'claude-code'

const SECTION = {
  id: 'java-rules:rules',
  text: "# Java rules\nUse constructor injection; no field injection.\nClose resources with try-with-resources.\nNever swallow exceptions: handle, wrap with the cause, or rethrow; log once at the boundary.\nUse `Optional` for return values only, never for fields or parameters.\nDTOs are immutable (final fields, no setters; a record if the language level allows).\nTarget the Java version the build file declares (`maven.compiler.release`, `sourceCompatibility`, toolchain); use no newer language features.",
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
  return (await has($, 'pom.xml')) || (await has($, 'build.gradle')) || (await has($, 'build.gradle.kts'))
}

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    cache.on ??= await detect($)

    return cache.on ? { sections: [...composed.sections, SECTION] } : composed
  })
}
