const en = {
  failed: 'weak-crypto-guard: the check failed, confirm before continuing.',
  hash: (where: string) =>
    `weak-crypto-guard: hashes a password or secret with MD5 or SHA-1 in ${where}. Both are fast to brute-force; use bcrypt, scrypt or argon2.`,
  random: (where: string) =>
    `weak-crypto-guard: uses a non-secure random generator for a token or secret in ${where}. The output is predictable; use crypto.randomBytes, crypto.getRandomValues or the secrets module.`,
  cipher: (where: string) =>
    `weak-crypto-guard: picks a weak cipher or ECB mode in ${where}. Patterns in the data show through; use AES-GCM.`,
  jwt: (where: string) =>
    `weak-crypto-guard: accepts unsigned, unverified or never-expiring JWTs in ${where}. Anyone can forge a token; verify the signature with a fixed list of algorithms.`,
}

type Strings = typeof en

const pt: Strings = {
  failed: 'weak-crypto-guard: a verificação falhou, confirme antes de continuar.',
  hash: where =>
    `weak-crypto-guard: faz hash de senha ou segredo com MD5 ou SHA-1 em ${where}. Os dois são rápidos de quebrar por força bruta; use bcrypt, scrypt ou argon2.`,
  random: where =>
    `weak-crypto-guard: usa um gerador aleatório inseguro para token ou segredo em ${where}. A saída é previsível; use crypto.randomBytes, crypto.getRandomValues ou o módulo secrets.`,
  cipher: where =>
    `weak-crypto-guard: escolhe uma cifra fraca ou o modo ECB em ${where}. Padrões dos dados aparecem no resultado; use AES-GCM.`,
  jwt: where =>
    `weak-crypto-guard: aceita JWT sem assinatura, sem verificação ou sem expiração em ${where}. Qualquer um pode forjar um token; verifique a assinatura com uma lista fixa de algoritmos.`,
}

const es: Strings = {
  failed: 'weak-crypto-guard: la verificación falló, confirma antes de continuar.',
  hash: where =>
    `weak-crypto-guard: hashea una contraseña o secreto con MD5 o SHA-1 en ${where}. Ambos son rápidos de romper por fuerza bruta; usa bcrypt, scrypt o argon2.`,
  random: where =>
    `weak-crypto-guard: usa un generador aleatorio inseguro para un token o secreto en ${where}. La salida es predecible; usa crypto.randomBytes, crypto.getRandomValues o el módulo secrets.`,
  cipher: where =>
    `weak-crypto-guard: elige un cifrado débil o el modo ECB en ${where}. Los patrones de los datos se ven en el resultado; usa AES-GCM.`,
  jwt: where =>
    `weak-crypto-guard: acepta JWT sin firma, sin verificación o sin expiración en ${where}. Cualquiera puede falsificar un token; verifica la firma con una lista fija de algoritmos.`,
}

export type What = 'hash' | 'random' | 'cipher' | 'jwt'

export const STRINGS = { en, pt, es }
