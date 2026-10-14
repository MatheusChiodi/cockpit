import type { EngineInterface, Register } from 'claude-code'

const SECTION = {
  id: 'a11y-rules:rules',
  text: "# Accessibility rules\nEvery form control has a visible `<label>` (or `aria-label` when no visible text fits).\nImages carry meaningful `alt`; decorative ones use `alt=\"\"`.\nEverything clickable is reachable and operable by keyboard: use `<button>` and `<a href>`, not clickable `<div>`.\nNever remove focus outlines without a visible replacement.\nPrefer semantic elements (`nav`, `main`, `header`, `ul`, `table`) over generic containers; one `h1`, no skipped heading levels.\nText contrast at least 4.5:1; never convey state by color alone.",
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

const manifestMentions = async ($: EngineInterface, needle: string): Promise<boolean> =>
  (await read($, 'package.json')).includes(needle)

const detect = async ($: EngineInterface): Promise<boolean> => {
  const deps = await depsOf($)
  const web = ['react', 'vue', 'svelte', '@angular/core'].some(name => deps.has(name))

  return web || (await has($, 'index.html')) || (await has($, 'public/index.html')) || (await manifestMentions($, '.html'))
}

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    cache.on ??= await detect($)

    return cache.on ? { sections: [...composed.sections, SECTION] } : composed
  })
}
