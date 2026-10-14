const en = {
  needsClient: (what: string, path: string) =>
    `next-boundary-guard: ${what} only works in a client component. Put 'use client' as the first line of ${path}, or move that part into a small client component.`,
  errorClient: (path: string) =>
    `next-boundary-guard: an error boundary must be a client component. Put 'use client' as the first line of ${path}.`,
  asyncClient: (path: string) =>
    `next-boundary-guard: ${path} has 'use client', and a client component cannot be async. Fetch in a server component and pass the data down as props.`,
  serverOnly: (spec: string, path: string) =>
    `next-boundary-guard: ${path} has 'use client' but imports "${spec}", which only runs on the server. Move that code to a server component, a route handler or a server action.`,
  failed: 'next-boundary-guard: the check failed, confirm the client/server boundary of the file.',
}

type Strings = typeof en

const pt: Strings = {
  needsClient: (what, path) =>
    `next-boundary-guard: ${what} só funciona em componente cliente. Ponha 'use client' na primeira linha de ${path}, ou mova essa parte para um componente cliente pequeno.`,
  errorClient: path =>
    `next-boundary-guard: um error boundary precisa ser componente cliente. Ponha 'use client' na primeira linha de ${path}.`,
  asyncClient: path =>
    `next-boundary-guard: ${path} tem 'use client', e componente cliente não pode ser async. Busque os dados num componente de servidor e passe por props.`,
  serverOnly: (spec, path) =>
    `next-boundary-guard: ${path} tem 'use client' mas importa "${spec}", que só roda no servidor. Mova esse código para um componente de servidor, um route handler ou uma server action.`,
  failed: 'next-boundary-guard: a verificação falhou, confirme a fronteira cliente/servidor do arquivo.',
}

const es: Strings = {
  needsClient: (what, path) =>
    `next-boundary-guard: ${what} solo funciona en un componente cliente. Pon 'use client' como primera línea de ${path}, o mueve esa parte a un componente cliente pequeño.`,
  errorClient: path =>
    `next-boundary-guard: un error boundary debe ser un componente cliente. Pon 'use client' como primera línea de ${path}.`,
  asyncClient: path =>
    `next-boundary-guard: ${path} tiene 'use client', y un componente cliente no puede ser async. Obtén los datos en un componente de servidor y pásalos por props.`,
  serverOnly: (spec, path) =>
    `next-boundary-guard: ${path} tiene 'use client' pero importa "${spec}", que solo corre en el servidor. Mueve ese código a un componente de servidor, un route handler o una server action.`,
  failed: 'next-boundary-guard: la verificación falló, confirma la frontera cliente/servidor del archivo.',
}

export const STRINGS = { en, pt, es }
