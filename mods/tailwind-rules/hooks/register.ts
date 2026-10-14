import type { EngineInterface, Register } from 'claude-code'

const SECTION = {
  id: 'tailwind-rules:rules',
  text: "# Tailwind rules\nUse the project's theme tokens (colors, spacing, fonts) and the utility patterns already in nearby components.\nNo arbitrary values (`w-[13px]`) when a scale step exists; extend the theme only when a value repeats.\nNo inline `style` for what a utility covers; no ad-hoc CSS files for layout.\nMobile-first: base classes for small screens, `sm:` / `md:` / `lg:` to scale up.",
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
  return (await depsOf($)).has('tailwindcss')
}

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    cache.on ??= await detect($)

    return cache.on ? { sections: [...composed.sections, SECTION] } : composed
  })
}
