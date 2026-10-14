import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const CONFIGS = [
  /(?:^|\/)\.github\/workflows\/[^/]+$/,
  /(?:^|\/)\.gitlab-ci\.ya?ml$/,
  /(?:^|\/)azure-pipelines\.ya?ml$/,
  /(?:^|\/)Jenkinsfile[^/]*$/,
  /(?:^|\/)\.circleci\/config\.ya?ml$/,
  /(?:^|\/)(?:vercel\.json|netlify\.toml|eas\.json)$/,
]

const pathOf = (input: unknown): string =>
  typeof input === 'object' && input !== null && typeof (input as { file_path?: unknown }).file_path === 'string'
    ? (input as { file_path: string }).file_path
    : ''

export const register: Register = on => {
  // Does not block: puts the edit to the person even when permissions already allow it.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)
    const path = e.tool === 'Edit' || e.tool === 'Write' ? pathOf(e.input) : ''

    if (verdict.decision !== 'allow' || !CONFIGS.some(config => config.test(path.replace(/\\/g, '/')))) {
      return verdict
    }

    return { decision: 'ask', reason: (await strings($)).ask(path) }
  }).catch(() => ({ decision: 'ask', reason: STRINGS.en.failed }))
}
