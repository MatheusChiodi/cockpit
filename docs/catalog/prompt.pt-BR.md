# Prompt e modelo — 18 mods

[← Voltar ao README](../../README.pt-BR.md)

[`concise-mode`](#concise-mode) · [`persona`](#persona) · [`prompt-shortcuts`](#prompt-shortcuts) · [`tldr`](#tldr) · [`git-context`](#git-context) · [`stack-context`](#stack-context) · [`commit-style`](#commit-style) · [`reply-language`](#reply-language) · [`time-context`](#time-context) · [`os-context`](#os-context) · [`test-first`](#test-first) · [`explain-mode`](#explain-mode) · [`plan-first`](#plan-first) · [`no-comments`](#no-comments) · [`minimal-diff`](#minimal-diff) · [`ask-first`](#ask-first) · [`verify-claims`](#verify-claims) · [`paste-fence`](#paste-fence)

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
