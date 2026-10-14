import type { EngineInterface, Register } from 'claude-code'

const SECTION = {
  id: 'rn-rules:rules',
  text: "# React Native rules\nLong or dynamic lists use `FlatList` (or `FlashList`), never `ScrollView` + `map`; give it `keyExtractor`.\nNo inline style objects or arrow functions in render paths of list items; use `StyleSheet.create` and memoized callbacks.\nPlatform differences go through `Platform.OS` / `Platform.select`, not guesses.\nPrefer Expo modules before reaching for bare native code or a new native dependency.\nKeep config EAS-compatible: settings in `app.json` / `app.config.*` and `eas.json`, no manual edits to generated native folders.",
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
  const deps = await depsOf($)

  return deps.has('react-native') || deps.has('expo')
}

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    cache.on ??= await detect($)

    return cache.on ? { sections: [...composed.sections, SECTION] } : composed
  })
}
