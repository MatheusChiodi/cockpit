const en = {
  failed: 'tls-off-guard: the check failed, confirm before continuing.',
  code: (where: string) =>
    `tls-off-guard: turns TLS certificate verification off in ${where}. Anyone on the network path can pose as the server; trust the right CA certificate instead of disabling the check.`,
  command: (where: string) =>
    `tls-off-guard: runs a command with TLS verification off (${where}). The connection can be intercepted without any warning; fix the certificate or point to the CA bundle instead.`,
}

type Strings = typeof en

const pt: Strings = {
  failed: 'tls-off-guard: a verificação falhou, confirme antes de continuar.',
  code: where =>
    `tls-off-guard: desliga a verificação do certificado TLS em ${where}. Qualquer um no caminho da rede pode se passar pelo servidor; confie no certificado da CA certa em vez de desligar a checagem.`,
  command: where =>
    `tls-off-guard: roda um comando com a verificação TLS desligada (${where}). A conexão pode ser interceptada sem aviso; corrija o certificado ou aponte para o bundle da CA.`,
}

const es: Strings = {
  failed: 'tls-off-guard: la verificación falló, confirma antes de continuar.',
  code: where =>
    `tls-off-guard: desactiva la verificación del certificado TLS en ${where}. Cualquiera en la ruta de red puede hacerse pasar por el servidor; confía en el certificado de la CA correcta en lugar de desactivar el chequeo.`,
  command: where =>
    `tls-off-guard: ejecuta un comando con la verificación TLS desactivada (${where}). La conexión puede ser interceptada sin aviso; corrige el certificado o apunta al bundle de la CA.`,
}

export type What = 'code' | 'command'

export const STRINGS = { en, pt, es }
