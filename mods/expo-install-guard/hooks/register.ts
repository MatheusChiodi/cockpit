import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Stack = { expo: boolean; devClient: boolean }

// Read once per module load: whether this is an Expo project and whether it runs a development build.
const cache: { stack: Stack | undefined } = { stack: undefined }

const detect = async ($: EngineInterface): Promise<Stack> => {
  const root = await $.session.root()
  const manifest = await $.fs.read(`${root}/package.json`).catch(() => undefined)
  let deps = new Set<string>()

  try {
    const parsed = JSON.parse(typeof manifest === 'string' ? manifest : '{}') as Record<string, object | undefined>
    deps = new Set([...Object.keys(parsed.dependencies ?? {}), ...Object.keys(parsed.devDependencies ?? {})])
  } catch {
    // Invalid package.json: no stack detected.
  }

  const eas = await $.fs.read(`${root}/eas.json`).catch(() => undefined)

  return { expo: deps.has('expo'), devClient: deps.has('expo-dev-client') || (typeof eas === 'string' && eas.includes('"developmentClient"')) }
}

// Packages the Expo SDK pins to one version each: `npx expo install` picks it, a plain install picks the latest.
const PINNED = new Set([
  'react',
  'react-native',
  'react-native-reanimated',
  'react-native-gesture-handler',
  'react-native-screens',
  'react-native-safe-area-context',
  'react-native-svg',
  'react-native-webview',
  'react-native-maps',
  'react-native-pager-view',
  'react-native-view-shot',
  'react-native-get-random-values',
  'react-native-worklets',
  'lottie-react-native',
  '@shopify/react-native-skia',
  '@shopify/flash-list',
  '@react-native-async-storage/async-storage',
  '@react-native-community/datetimepicker',
  '@react-native-community/netinfo',
  '@react-native-community/slider',
  '@react-native-picker/picker',
  '@react-native-masked-view/masked-view',
  '@stripe/stripe-react-native',
  '@sentry/react-native',
  'jest-expo',
])

const isPinned = (name: string): boolean => name === 'expo' || name.startsWith('expo-') || name.startsWith('@expo/') || PINNED.has(name)

// Packages with native code but no JS-only look-alikes: installing one needs a new development build.
const JS_ONLY = new Set(['react', 'expo', 'expo-router', 'expo-status-bar', '@expo/vector-icons', 'jest-expo', 'react-native-get-random-values'])

const isNative = (name: string): boolean =>
  !JS_ONLY.has(name) &&
  (name.startsWith('expo-') ||
    name.startsWith('react-native-') ||
    name.startsWith('@react-native') ||
    name.startsWith('@shopify/react-native') ||
    PINNED.has(name))

type Install = { manager: string; viaExpo: boolean; packages: { name: string; versioned: boolean }[] }

const MANAGERS = new Set(['npm', 'pnpm', 'yarn', 'bun'])
const PACKAGE = /^(?:@[\w.-]+\/)?[\w.-]+(?:@[\w.^~<>=*-]+)?$/

// The install a command segment performs; undefined when it installs nothing by name or is global.
const installOf = (segment: string): Install | undefined => {
  const tokens = segment.trim().replace(/^(?:\w+=\S+\s+)*/, '').split(/\s+/)
  let at = 0

  if (tokens[at] === 'npx' || tokens[at] === 'bunx' || ((tokens[at] === 'pnpm' || tokens[at] === 'yarn') && tokens[at + 1] === 'dlx')) {
    at += tokens[at] === 'npx' || tokens[at] === 'bunx' ? 1 : 2
  }

  const viaExpo = tokens[at] === 'expo' && tokens[at + 1] === 'install'
  const manager = tokens[at] ?? ''
  const manages = MANAGERS.has(manager) && ['install', 'i', 'add'].includes(tokens[at + 1] ?? '')

  if ((!viaExpo && !manages) || tokens.some(token => token === '-g' || token === '--global')) {
    return undefined
  }

  const packages = tokens
    .slice(at + 2)
    .filter(token => !token.startsWith('-') && PACKAGE.test(token))
    .map(token => {
      const version = token.lastIndexOf('@')

      return version > 0 ? { name: token.slice(0, version), versioned: true } : { name: token, versioned: false }
    })

  return { manager: viaExpo ? 'npx expo' : manager, viaExpo, packages }
}

type Verdict = { deny?: string; natives: string[] }

// Refuses a plain install of an SDK-pinned package; otherwise lists the native packages the command installs.
const inspect = async ($: EngineInterface, command: string): Promise<Verdict> => {
  cache.stack ??= await detect($)

  if (!cache.stack.expo) {
    return { natives: [] }
  }

  const natives: string[] = []

  for (const segment of command.split(/&&|\|\||;|\n/)) {
    const install = installOf(segment)

    if (install === undefined) {
      continue
    }

    const pinned = install.packages.filter(item => !item.versioned && isPinned(item.name))

    if (!install.viaExpo && pinned.length > 0) {
      const names = pinned.map(item => item.name).join(' ')
      const everything = install.packages.map(item => item.name).join(' ')

      return { deny: (await strings($)).pinned(names, install.manager, everything), natives }
    }

    natives.push(...install.packages.filter(item => isNative(item.name)).map(item => item.name))
  }

  return { natives: cache.stack.devClient ? [...new Set(natives)] : [] }
}

const note = (names: string): string =>
  `expo-install-guard: ${names} adds native code. An installed development build cannot load it from Metro: rebuild the dev client (eas build --profile development --platform android|ios, or npx expo run:android / run:ios) and reinstall it on the device before testing. Expo Go only has the modules bundled with it.`

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const verdict = await inspect($, e.command)

    if (verdict.deny !== undefined) {
      return { deny: verdict.deny }
    }

    const ran = await next(e)

    if (verdict.natives.length === 0 || ran.deny !== undefined || ran.isError === true) {
      return ran
    }

    const names = verdict.natives.join(', ')
    $.ui.toast((await strings($)).rebuild(names), { timeoutMs: 6000 })

    return { ...ran, context: [...(ran.context ?? []), note(names)] }
  }).catch((_$, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => {
    const verdict = await inspect($, e.command)

    if (verdict.deny !== undefined) {
      return { deny: verdict.deny }
    }

    const ran = await next(e)

    if (verdict.natives.length === 0 || ran.deny !== undefined || ran.isError === true) {
      return ran
    }

    const names = verdict.natives.join(', ')
    $.ui.toast((await strings($)).rebuild(names), { timeoutMs: 6000 })

    return { ...ran, context: [...(ran.context ?? []), note(names)] }
  }).catch((_$, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))
}
