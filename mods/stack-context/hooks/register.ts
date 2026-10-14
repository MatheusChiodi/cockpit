import type { EngineInterface, Register } from 'claude-code'

const KNOWN: readonly (readonly [string, string])[] = [
  ['next', 'Next.js'],
  ['react-native', 'React Native'],
  ['expo', 'Expo'],
  ['react', 'React'],
  ['vue', 'Vue'],
  ['svelte', 'Svelte'],
  ['@angular/core', 'Angular'],
  ['tailwindcss', 'Tailwind CSS'],
  ['typescript', 'TypeScript'],
  ['vite', 'Vite'],
  ['express', 'Express'],
  ['fastify', 'Fastify'],
  ['@nestjs/core', 'NestJS'],
  ['prisma', 'Prisma'],
  ['drizzle-orm', 'Drizzle'],
  ['vitest', 'Vitest'],
  ['jest', 'Jest'],
  ['@playwright/test', 'Playwright'],
  ['zustand', 'Zustand'],
  ['@reduxjs/toolkit', 'Redux Toolkit'],
]

const FILES: readonly (readonly [string, string])[] = [
  ['pom.xml', 'Java (Maven)'],
  ['build.gradle', 'Java/Kotlin (Gradle)'],
  ['requirements.txt', 'Python'],
  ['pyproject.toml', 'Python'],
  ['Cargo.toml', 'Rust'],
  ['go.mod', 'Go'],
  ['app.json', 'Expo (app.json)'],
  ['eas.json', 'EAS Build'],
]

// Read once per module load: the stack does not change mid-session.
// The section is read by the model only: English, not translated.
const cache: { text: string | undefined } = { text: undefined }

const detect = async ($: EngineInterface): Promise<string> => {
  const root = await $.session.root()
  const found: string[] = []
  const manifest = await $.fs.read(`${root}/package.json`).catch(() => undefined)

  if (manifest !== undefined) {
    try {
      const parsed = JSON.parse(manifest) as { dependencies?: object; devDependencies?: object }
      const deps = new Set([...Object.keys(parsed.dependencies ?? {}), ...Object.keys(parsed.devDependencies ?? {})])
      found.push(...KNOWN.filter(([name]) => deps.has(name)).map(([, label]) => label))
    } catch {
      // Invalid package.json: carry on with the marker files only.
    }
  }

  for (const [file, label] of FILES) {
    if (await $.fs.exists(`${root}/${file}`)) {
      found.push(label)
    }
  }

  return [...new Set(found)].join(', ')
}

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    cache.text ??= await detect($)

    return cache.text === ''
      ? composed
      : {
          sections: [
            ...composed.sections,
            {
              id: 'stack-context:stack',
              text: `# This project's stack\n${cache.text}.\nUse the patterns and APIs of these tools; do not propose changing the stack unless asked.`,
              scope: 'session',
            },
          ],
        }
  })
}
