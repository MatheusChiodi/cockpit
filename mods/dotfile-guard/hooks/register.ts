import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// The person's home in every spelling: a dotfile one level below it is a profile, deeper it is the project's.
const HOME = String.raw`(?:~|\$HOME|\$\{HOME\}|\$env:USERPROFILE|%USERPROFILE%|/home/[^/]+|/Users/[^/]+|/root|/mnt/[a-z]/Users/[^/]+|/[a-z]/Users/[^/]+|[a-z]:/Users/[^/]+)`
const PROFILES = String.raw`(?:\.bashrc|\.bash_profile|\.bash_login|\.profile|\.zshrc|\.zshenv|\.zprofile|\.gitconfig|\.ssh/config)`

const IN_HOME = new RegExp(`^${HOME}/${PROFILES}$`, 'i')
const POWERSHELL = /(?:^|\/)(?:Windows)?PowerShell\/(?:Microsoft\.\w+_)?profile\.ps1$/i

const isProfile = (path: string): boolean => {
  const normal = path.replace(/\\/g, '/')

  return IN_HOME.test(normal) || POWERSHELL.test(normal) || /^\$PROFILE\b/i.test(normal)
}

const verdict = async ($: EngineInterface, path: string): Promise<string | undefined> =>
  isProfile(path) ? (await strings($)).blocked(path) : undefined

export const register: Register = on => {
  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const deny = await verdict($, e.file_path)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const deny = await verdict($, e.file_path)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))
}
