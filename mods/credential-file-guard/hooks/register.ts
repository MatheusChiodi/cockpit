import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// A home directory, written any way a path can name it.
const HOME = String.raw`(?:~|\$\{?HOME\}?|%USERPROFILE%|\$env:USERPROFILE|/(?:home|Users)/[^/\s'"]+|/root)`

const STORES: readonly RegExp[] = [
  /(?<![\w.-])\.ssh\/id_[\w.*?-]*/i,
  /(?<![\w.-])\.aws\/credentials/i,
  /(?<![\w.-])[._]netrc\b/i,
  /(?<![\w.-])\.git-credentials/i,
  /(?<![\w.-])\.docker\/config\.json/i,
  /(?<![\w.-])\.kube\/config/i,
  // A project's own .npmrc is configuration; the one in the home directory holds auth tokens.
  new RegExp(`${HOME}/\\.npmrc`, 'i'),
  /\.(?:bash|zsh|sh|python|node_repl|psql|mysql)_history|fish_history|ConsoleHost_history\.txt/i,
]

// A private key named on its own, as after a cd into ~/.ssh.
const BARE_KEY = /(?<![\w.-])id_(?:rsa|ed25519|ecdsa|dsa)(?![\w.-])/

// Commands that put a file's content in front of the model or copy it somewhere.
const READERS =
  /(?<![\w.-])(?:cat|less|more|head|tail|bat|batcat|type|gc|Get-Content|cp|copy|Copy-Item|xcopy|mv|move|scp|rsync|curl|wget|base64|xxd|od|strings|grep|egrep|rg|awk|sed|cut|sort|nl|tac|tee|source|open|code|vim|vi|nano|notepad|Select-String|sls|ReadAllText|ReadAllBytes|Import-Clixml)(?![\w.-])|<\s*\S/i

// The credential path a text names, if any. A public key (.pub) is not one.
const credentialIn = (text: string): string | undefined => {
  const normal = text.replace(/\\/g, '/')

  for (const store of STORES) {
    const found = store.exec(normal)?.[0]

    if (found !== undefined && !found.endsWith('.pub')) {
      return found
    }
  }

  return undefined
}

const shellVerdict = async ($: EngineInterface, command: string): Promise<string | undefined> => {
  if (!READERS.test(command)) {
    return undefined
  }

  const path = credentialIn(command) ?? BARE_KEY.exec(command)?.[0]

  return path === undefined ? undefined : (await strings($)).blocked(path)
}

const readVerdict = async ($: EngineInterface, filePath: string): Promise<string | undefined> => {
  const path = credentialIn(filePath)

  return path === undefined ? undefined : (await strings($)).blocked(filePath)
}

export const register: Register = on => {
  on('tool.call', { tool: 'Read' }, async ($, e, next) => {
    const deny = await readVerdict($, e.file_path)

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
}
