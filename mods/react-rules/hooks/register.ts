import type { EngineInterface, Register } from 'claude-code'

const SECTION = {
  id: 'react-rules:rules',
  text: "# React rules\nCall hooks only at the top level of components and custom hooks, never in conditions, loops or callbacks.\nNever define a component inside another component; hoist it or pass props.\nUse stable, unique keys (ids); never array indexes for lists that reorder, insert or delete.\nDerive values during render instead of mirroring props or state into more state.\nUse effects only to synchronize with external systems; compute in render, react to events in handlers.",
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
  return (await depsOf($)).has('react')
}

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    cache.on ??= await detect($)

    return cache.on ? { sections: [...composed.sections, SECTION] } : composed
  })
}
