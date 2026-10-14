# Prompt e modelo — 30 mods

[← Voltar ao README](../../README.pt-BR.md)

[`concise-mode`](#concise-mode) · [`persona`](#persona) · [`prompt-shortcuts`](#prompt-shortcuts) · [`tldr`](#tldr) · [`git-context`](#git-context) · [`stack-context`](#stack-context) · [`commit-style`](#commit-style) · [`reply-language`](#reply-language) · [`time-context`](#time-context) · [`os-context`](#os-context) · [`test-first`](#test-first) · [`explain-mode`](#explain-mode) · [`plan-first`](#plan-first) · [`no-comments`](#no-comments) · [`minimal-diff`](#minimal-diff) · [`ask-first`](#ask-first) · [`verify-claims`](#verify-claims) · [`paste-fence`](#paste-fence) · [`file-mention-hint`](#file-mention-hint) · [`trace-helper`](#trace-helper) · [`branch-naming`](#branch-naming) · [`pr-style`](#pr-style) · [`a11y-rules`](#a11y-rules) · [`security-rules`](#security-rules) · [`react-rules`](#react-rules) · [`tailwind-rules`](#tailwind-rules) · [`rn-rules`](#rn-rules) · [`java-rules`](#java-rules) · [`oracle-rules`](#oracle-rules) · [`answer-format`](#answer-format)

## `concise-mode`

/concise liga respostas curtas e diretas, sem introdução nem recapitulação.

```
/plugin install concise-mode@cockpit
```

![concise-mode](../previews/concise-mode.svg)

## `persona`

/persona troca a voz do Claude: mentor, senior, rubberduck, pirata, yoda, zen.

```
/plugin install persona@cockpit
```

![persona](../previews/persona.svg)

## `prompt-shortcuts`

Atalhos ::fix, ::test, ::review, ::explain, ::refactor, ::doc, ::commit viram prompts completos.

```
/plugin install prompt-shortcuts@cockpit
```

![prompt-shortcuts](../previews/prompt-shortcuts.svg)

## `tldr`

Acrescenta um TL;DR de 2 frases (via haiku) abaixo de respostas longas.

```
/plugin install tldr@cockpit
```

![tldr](../previews/tldr.svg)

## `git-context`

Anexa o estado do git (branch e arquivos alterados) a cada prompt, como contexto oculto.

```
/plugin install git-context@cockpit
```

![git-context](../previews/git-context.svg)

## `stack-context`

Detecta a stack do projeto (package.json, pom.xml...) e informa o Claude no system prompt.

```
/plugin install stack-context@cockpit
```

![stack-context](../previews/stack-context.svg)

## `commit-style`

Faz o Claude escrever commits em Conventional Commits, curtos e no imperativo.

```
/plugin install commit-style@cockpit
```

![commit-style](../previews/commit-style.svg)

## `reply-language`

Faz o Claude responder sempre no idioma definido no hub Cockpit, mantendo código e comandos no original.

```
/plugin install reply-language@cockpit
```

![reply-language](../previews/reply-language.svg)

## `time-context`

Todo prompt leva a data, o dia da semana, a hora e o fuso locais para as datas relativas saírem certas.

```
/plugin install time-context@cockpit
```

![time-context](../previews/time-context.svg)

## `os-context`

Informa ao Claude seu sistema operacional, shell e as versões instaladas de node, python, java e git.

```
/plugin install os-context@cockpit
```

![os-context](../previews/os-context.svg)

## `test-first`

/tdd liga o trabalho test-first: um teste que falha antes do código, rodado antes e depois.

```
/plugin install test-first@cockpit
```

![test-first](../previews/test-first.svg)

## `explain-mode`

/explain faz o Claude explicar cada mudança em uma ou duas frases, para quem está aprendendo o código.

```
/plugin install explain-mode@cockpit
```

![explain-mode](../previews/explain-mode.svg)

## `plan-first`

/plan-first faz o Claude listar os arquivos e a ordem antes de editar uma mudança em mais de dois arquivos.

```
/plugin install plan-first@cockpit
```

![plan-first](../previews/plan-first.svg)

## `no-comments`

Tira do código comentários que repetem o código, banners e código comentado; fica só o porquê.

```
/plugin install no-comments@cockpit
```

![no-comments](../previews/no-comments.svg)

## `minimal-diff`

Pede a menor mudança que resolve o pedido, sem refatorações de carona; o que for notado é apenas mencionado.

```
/plugin install minimal-diff@cockpit
```

![minimal-diff](../previews/minimal-diff.svg)

## `ask-first`

Quando um pedido tem duas leituras que levam a códigos diferentes, o Claude faz uma pergunta curta antes.

```
/plugin install ask-first@cockpit
```

![ask-first](../previews/ask-first.svg)

## `verify-claims`

O Claude não diz que algo funciona sem rodar, e termina dizendo o que foi e o que não foi verificado.

```
/plugin install verify-claims@cockpit
```

![verify-claims](../previews/verify-claims.svg)

## `paste-fence`

Envolve em um bloco de código o trecho colado de 6+ linhas de código ou log antes do envio, deixando suas frases de fora.

```
/plugin install paste-fence@cockpit
```

![paste-fence](../previews/paste-fence.svg)

## `file-mention-hint`

Quando o prompt cita um arquivo sem caminho, adiciona os caminhos rastreados que combinam para o Claude abrir o arquivo certo.

```
/plugin install file-mention-hint@cockpit
```

![file-mention-hint](../previews/file-mention-hint.svg)

## `trace-helper`

Adiciona uma dica oculta aos prompts com stack trace: achar o primeiro frame do projeto, ler o código e dizer a causa raiz.

```
/plugin install trace-helper@cockpit
```

![trace-helper](../previews/trace-helper.svg)

## `branch-naming`

Ensina ao Claude a convenção de nomes de branch: feat/, fix/, chore/, refactor/, docs/ e nunca trabalho novo na main.

```
/plugin install branch-naming@cockpit
```

![branch-naming](../previews/branch-naming.svg)

## `pr-style`

Faz as descrições de pull request seguirem o que mudou, por quê, como foi testado e riscos, com título em Conventional Commits.

```
/plugin install pr-style@cockpit
```

![pr-style](../previews/pr-style.svg)

## `a11y-rules`

Em projetos web, mantém o Claude nas regras de acessibilidade ao editar markup: labels, alt, teclado, foco e contraste.

```
/plugin install a11y-rules@cockpit
```

![a11y-rules](../previews/a11y-rules.svg)

## `security-rules`

Regras de segurança sempre ativas: validar entrada, queries parametrizadas, sem segredos em código ou logs, privilégio mínimo, TLS ligado.

```
/plugin install security-rules@cockpit
```

![security-rules](../previews/security-rules.svg)

## `react-rules`

Em projetos React, mantém o Claude nas regras de hooks, keys estáveis, estado derivado e effects só para sincronização.

```
/plugin install react-rules@cockpit
```

![react-rules](../previews/react-rules.svg)

## `tailwind-rules`

Em projetos Tailwind, mantém o Claude nos tokens do tema, nos passos da escala e no mobile-first, sem estilos inline.

```
/plugin install tailwind-rules@cockpit
```

![tailwind-rules](../previews/tailwind-rules.svg)

## `rn-rules`

Em projetos React Native e Expo, mantém o Claude em FlatList, StyleSheet, checagens via Platform e config compatível com EAS.

```
/plugin install rn-rules@cockpit
```

![rn-rules](../previews/rn-rules.svg)

## `java-rules`

Em projetos Java, mantém o Claude em injeção por construtor, try-with-resources, sem exceções engolidas e na versão de Java declarada.

```
/plugin install java-rules@cockpit
```

![java-rules](../previews/java-rules.svg)

## `oracle-rules`

Em projetos Oracle, faz o Claude escrever SQL que roda no Oracle 11g: ROWNUM, sequence com trigger, bind variables, MERGE.

```
/plugin install oracle-rules@cockpit
```

![oracle-rules](../previews/oracle-rules.svg)

## `answer-format`

/format define o formato das respostas (bullets, steps, table ou prose) e mostra na linha de status.

```
/plugin install answer-format@cockpit
```

![answer-format](../previews/answer-format.svg)
