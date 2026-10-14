const en = {
  failed: 'private-host-guard: the check failed, confirm before continuing.',
  ip: (where: string) =>
    `private-host-guard: adds a private IP address to ${where}. It ties the code to one network and exposes the internal layout; take it from configuration or an environment variable.`,
  host: (where: string) =>
    `private-host-guard: adds an internal hostname to ${where}. It reveals the internal network and breaks everywhere else; take the address from configuration or an environment variable.`,
}

type Strings = typeof en

const pt: Strings = {
  failed: 'private-host-guard: a verificação falhou, confirme antes de continuar.',
  ip: where =>
    `private-host-guard: adiciona um endereço IP privado em ${where}. Prende o código a uma rede e expõe a estrutura interna; leia de configuração ou de uma variável de ambiente.`,
  host: where =>
    `private-host-guard: adiciona um hostname interno em ${where}. Revela a rede interna e quebra em qualquer outro ambiente; leia o endereço de configuração ou de uma variável de ambiente.`,
}

const es: Strings = {
  failed: 'private-host-guard: la verificación falló, confirma antes de continuar.',
  ip: where =>
    `private-host-guard: agrega una dirección IP privada en ${where}. Ata el código a una red y expone la estructura interna; léela de la configuración o de una variable de entorno.`,
  host: where =>
    `private-host-guard: agrega un hostname interno en ${where}. Revela la red interna y falla en cualquier otro entorno; lee la dirección de la configuración o de una variable de entorno.`,
}

export type What = 'ip' | 'host'

export const STRINGS = { en, pt, es }
