const en = {
  pinned: (names: string, manager: string, args: string) =>
    `expo-install-guard: ${names} is pinned to the Expo SDK, and "${manager} install" fetches the latest version, which may not match it. Run "npx expo install ${args}" so the version fits the SDK.`,
  rebuild: (names: string) => `expo-install-guard: ${names} has native code, rebuild the development build before testing`,
  failed: 'expo-install-guard: the check failed, use "npx expo install" for packages pinned to the Expo SDK.',
}

type Strings = typeof en

const pt: Strings = {
  pinned: (names, manager, args) =>
    `expo-install-guard: ${names} tem versão fixada pelo Expo SDK e "${manager} install" baixa a última versão, que pode não combinar. Rode "npx expo install ${args}" para a versão servir ao SDK.`,
  rebuild: names => `expo-install-guard: ${names} tem código nativo, refaça o development build antes de testar`,
  failed: 'expo-install-guard: a verificação falhou, use "npx expo install" para pacotes fixados pelo Expo SDK.',
}

const es: Strings = {
  pinned: (names, manager, args) =>
    `expo-install-guard: ${names} tiene la versión fijada por el Expo SDK y "${manager} install" descarga la última, que puede no coincidir. Ejecuta "npx expo install ${args}" para que la versión sirva al SDK.`,
  rebuild: names => `expo-install-guard: ${names} tiene código nativo, rehaz el development build antes de probar`,
  failed: 'expo-install-guard: la verificación falló, usa "npx expo install" para paquetes fijados por el Expo SDK.',
}

export const STRINGS = { en, pt, es }
