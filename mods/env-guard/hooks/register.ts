import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const ENV_FILE = /(^|[\\/])\.env(\.[^\\/]*)?$/i
const TEMPLATE = /\.(example|sample|template|dist)$/i
const SHELL_READ =
  /\b(cat|less|more|head|tail|bat|type|gc|Get-Content|source)\s[^|;&\n]*?(?<![\w.-])\.env(?!\.(?:example|sample|template|dist)\b)(?:\.[\w-]+)*(?![\w.-])/i

const isProtected = (path: string): boolean => ENV_FILE.test(path) && !TEMPLATE.test(path)

// The refusal for a path, in the session's language; undefined when the path may be touched.
const fileVerdict = async ($: EngineInterface, path: string): Promise<string | undefined> =>
  isProtected(path) ? (await strings($)).denied(path) : undefined

const shellVerdict = async ($: EngineInterface, command: string): Promise<string | undefined> =>
  SHELL_READ.test(command) ? (await strings($)).denied('.env') : undefined

export const register: Register = on => {
  on('tool.call', { tool: 'Read' }, async ($, e, next) => {
    const deny = await fileVerdict($, e.file_path)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const deny = await fileVerdict($, e.file_path)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const deny = await fileVerdict($, e.file_path)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const deny = await shellVerdict($, e.command)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => {
    const deny = await shellVerdict($, e.command)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))

  // @.env in the prompt reads the file too, without going through tool.call.
  on('prompt.mention', async ($, e, next) => {
    const deny = await fileVerdict($, e.path)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))
}
