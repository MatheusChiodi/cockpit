const en = {
  failed: 'hardcoded-secret-guard: the check failed, confirm before continuing.',
  password: (where: string) =>
    `hardcoded-secret-guard: adds a hardcoded password or key to ${where}. It stays in the repository history even if removed later; read it from an environment variable or a secret store instead.`,
  connection: (where: string) =>
    `hardcoded-secret-guard: adds a connection string with the password inside to ${where}. It leaks through the repository and the logs; keep the credentials in environment variables and build the URL from them.`,
  jwt: (where: string) =>
    `hardcoded-secret-guard: adds what looks like a JWT to ${where}. Whoever reads the repository can replay it; load it at run time, and rotate it if it is real.`,
}

type Strings = typeof en

const pt: Strings = {
  failed: 'hardcoded-secret-guard: a verificação falhou, confirme antes de continuar.',
  password: where =>
    `hardcoded-secret-guard: adiciona uma senha ou chave fixa em ${where}. Ela fica no histórico do repositório mesmo se removida depois; leia de uma variável de ambiente ou de um cofre de segredos.`,
  connection: where =>
    `hardcoded-secret-guard: adiciona em ${where} uma connection string com a senha dentro. Ela vaza pelo repositório e pelos logs; mantenha as credenciais em variáveis de ambiente e monte a URL a partir delas.`,
  jwt: where =>
    `hardcoded-secret-guard: adiciona em ${where} o que parece um JWT. Quem lê o repositório pode reutilizá-lo; carregue em tempo de execução e troque o token se for real.`,
}

const es: Strings = {
  failed: 'hardcoded-secret-guard: la verificación falló, confirma antes de continuar.',
  password: where =>
    `hardcoded-secret-guard: agrega una contraseña o clave fija en ${where}. Queda en el historial del repositorio aunque se quite después; léela de una variable de entorno o de un almacén de secretos.`,
  connection: where =>
    `hardcoded-secret-guard: agrega en ${where} una cadena de conexión con la contraseña dentro. Se filtra por el repositorio y los logs; guarda las credenciales en variables de entorno y arma la URL con ellas.`,
  jwt: where =>
    `hardcoded-secret-guard: agrega en ${where} lo que parece un JWT. Quien lea el repositorio puede reutilizarlo; cárgalo en tiempo de ejecución y rota el token si es real.`,
}

export type What = 'password' | 'connection' | 'jwt'

export const STRINGS = { en, pt, es }
