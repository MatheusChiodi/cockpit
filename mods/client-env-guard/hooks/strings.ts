const en = {
  viteHidden: (name: string, path: string) =>
    `client-env-guard: Vite hides ${name} from the browser (${path}). Rename it VITE_${name} in code and in .env.`,
  viteProcess: (name: string, path: string) =>
    `client-env-guard: Vite does not define process.env in the browser (${path}). Use import.meta.env.VITE_${name} and name the variable VITE_${name} in .env.`,
  nextHidden: (name: string, path: string) =>
    `client-env-guard: ${name} is undefined in the browser (${path} is a client component). Next.js only inlines NEXT_PUBLIC_ variables: rename it NEXT_PUBLIC_${name}, or read it in a server component.`,
  failed: 'client-env-guard: the check failed, confirm the variable is exposed to the browser.',
}

type Strings = typeof en

const pt: Strings = {
  viteHidden: (name, path) =>
    `client-env-guard: o Vite esconde ${name} do navegador (${path}). Renomeie para VITE_${name} no código e no .env.`,
  viteProcess: (name, path) =>
    `client-env-guard: o Vite não define process.env no navegador (${path}). Use import.meta.env.VITE_${name} e chame a variável de VITE_${name} no .env.`,
  nextHidden: (name, path) =>
    `client-env-guard: ${name} é undefined no navegador (${path} é um componente cliente). O Next.js só embute variáveis NEXT_PUBLIC_: renomeie para NEXT_PUBLIC_${name} ou leia num componente de servidor.`,
  failed: 'client-env-guard: a verificação falhou, confirme que a variável é exposta ao navegador.',
}

const es: Strings = {
  viteHidden: (name, path) =>
    `client-env-guard: Vite oculta ${name} del navegador (${path}). Renómbrala VITE_${name} en el código y en .env.`,
  viteProcess: (name, path) =>
    `client-env-guard: Vite no define process.env en el navegador (${path}). Usa import.meta.env.VITE_${name} y llama a la variable VITE_${name} en .env.`,
  nextHidden: (name, path) =>
    `client-env-guard: ${name} es undefined en el navegador (${path} es un componente cliente). Next.js solo incrusta variables NEXT_PUBLIC_: renómbrala NEXT_PUBLIC_${name} o léela en un componente de servidor.`,
  failed: 'client-env-guard: la verificación falló, confirma que la variable se expone al navegador.',
}

export const STRINGS = { en, pt, es }
