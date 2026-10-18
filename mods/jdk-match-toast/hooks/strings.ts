const en = {
  older: (file: string, declared: number, running: number) =>
    `jdk-match-toast: ${file} declares JDK ${declared}, the java on the PATH is ${running}`,
}

type Strings = typeof en

const pt: Strings = {
  older: (file, declared, running) => `jdk-match-toast: ${file} declara JDK ${declared}, o java do PATH é o ${running}`,
}

const es: Strings = {
  older: (file, declared, running) => `jdk-match-toast: ${file} declara JDK ${declared}, el java del PATH es el ${running}`,
}

export const STRINGS = { en, pt, es }
