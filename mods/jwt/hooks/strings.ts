const en = {
  command: 'Decode a JWT header and payload locally, never verifying or sending it (uses the mouse selection)',
  hint: '[token]',
  usage: 'Usage: /jwt <token>  (or select the token and run /jwt)',
  notJwt: (parts: number) => `Not a JWT: expected 3 parts separated by dots, found ${parts}.`,
  badPart: (name: string, why: string) => `The ${name} is not valid: ${why}.`,
  notBase64: 'it is not base64url',
  notJson: 'it is not JSON',
  header: 'header',
  payload: 'payload',
  expired: 'expired',
  valid: 'still valid',
  notYet: 'not valid yet',
  note: 'Decoded only: the signature was not verified.',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Decodifica header e payload de um JWT localmente, sem verificar nem enviar (usa a seleção do mouse)',
  hint: '[token]',
  usage: 'Uso: /jwt <token>  (ou selecione o token e rode /jwt)',
  notJwt: parts => `Não é um JWT: eram esperadas 3 partes separadas por ponto, achei ${parts}.`,
  badPart: (name, why) => `O ${name} não é válido: ${why}.`,
  notBase64: 'não é base64url',
  notJson: 'não é JSON',
  header: 'header',
  payload: 'payload',
  expired: 'expirado',
  valid: 'ainda válido',
  notYet: 'ainda não válido',
  note: 'Apenas decodificado: a assinatura não foi verificada.',
}

const es: Strings = {
  command: 'Decodifica header y payload de un JWT localmente, sin verificar ni enviar (usa la selección del ratón)',
  hint: '[token]',
  usage: 'Uso: /jwt <token>  (o selecciona el token y ejecuta /jwt)',
  notJwt: parts => `No es un JWT: se esperaban 3 partes separadas por punto, encontré ${parts}.`,
  badPart: (name, why) => `El ${name} no es válido: ${why}.`,
  notBase64: 'no es base64url',
  notJson: 'no es JSON',
  header: 'header',
  payload: 'payload',
  expired: 'expirado',
  valid: 'aún válido',
  notYet: 'aún no válido',
  note: 'Solo decodificado: la firma no se verificó.',
}

export const STRINGS = { en, pt, es }
