const en = {
  command: 'GET a URL and show status, content type, size and the first lines of the body',
  hint: '<url>',
  usage: 'Usage: /http <url>  (http and https only)',
  failed: (message: string) => `Request failed: ${message}`,
  status: 'status',
  type: 'type',
  size: 'size',
  bytes: 'bytes',
  empty: '(empty body)',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Faz um GET numa URL e mostra status, tipo de conteúdo, tamanho e as primeiras linhas do corpo',
  hint: '<url>',
  usage: 'Uso: /http <url>  (somente http e https)',
  failed: message => `A requisição falhou: ${message}`,
  status: 'status',
  type: 'tipo',
  size: 'tamanho',
  bytes: 'bytes',
  empty: '(corpo vazio)',
}

const es: Strings = {
  command: 'Hace un GET a una URL y muestra estado, tipo de contenido, tamaño y las primeras líneas del cuerpo',
  hint: '<url>',
  usage: 'Uso: /http <url>  (solo http y https)',
  failed: message => `La solicitud falló: ${message}`,
  status: 'estado',
  type: 'tipo',
  size: 'tamaño',
  bytes: 'bytes',
  empty: '(cuerpo vacío)',
}

export const STRINGS = { en, pt, es }
