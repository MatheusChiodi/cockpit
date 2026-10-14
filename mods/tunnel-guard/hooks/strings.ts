const en = {
  ask: (what: string) => `tunnel-guard: ${what}. This exposes your machine to the internet. Confirm before running.`,
  failed: 'tunnel-guard: the check failed, confirm manually.',
  tunnel: 'opening a public tunnel',
  reverse: 'opening a reverse SSH tunnel (ssh -R)',
  funnel: 'publishing with tailscale funnel',
  bind: 'binding a server to every network interface (0.0.0.0)',
}

type Strings = typeof en

const pt: Strings = {
  ask: what => `tunnel-guard: ${what}. Isso expõe sua máquina à internet. Confirme antes de rodar.`,
  failed: 'tunnel-guard: a verificação falhou, confirme manualmente.',
  tunnel: 'abrir um túnel público',
  reverse: 'abrir um túnel SSH reverso (ssh -R)',
  funnel: 'publicar com tailscale funnel',
  bind: 'ligar um servidor a todas as interfaces de rede (0.0.0.0)',
}

const es: Strings = {
  ask: what => `tunnel-guard: ${what}. Esto expone tu máquina a internet. Confirma antes de ejecutar.`,
  failed: 'tunnel-guard: la verificación falló, confirma manualmente.',
  tunnel: 'abrir un túnel público',
  reverse: 'abrir un túnel SSH inverso (ssh -R)',
  funnel: 'publicar con tailscale funnel',
  bind: 'enlazar un servidor a todas las interfaces de red (0.0.0.0)',
}

export type Reason = Exclude<keyof Strings, 'ask' | 'failed'>

export const STRINGS = { en, pt, es }
