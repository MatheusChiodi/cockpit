# Prompt y modelo — 20 mods

[← Volver al README](../../README.es.md)

[`concise-mode`](#concise-mode) · [`persona`](#persona) · [`prompt-shortcuts`](#prompt-shortcuts) · [`tldr`](#tldr) · [`git-context`](#git-context) · [`stack-context`](#stack-context) · [`commit-style`](#commit-style) · [`reply-language`](#reply-language) · [`time-context`](#time-context) · [`os-context`](#os-context) · [`test-first`](#test-first) · [`explain-mode`](#explain-mode) · [`plan-first`](#plan-first) · [`no-comments`](#no-comments) · [`minimal-diff`](#minimal-diff) · [`ask-first`](#ask-first) · [`verify-claims`](#verify-claims) · [`paste-fence`](#paste-fence) · [`file-mention-hint`](#file-mention-hint) · [`trace-helper`](#trace-helper)

## `concise-mode`

/concise activa respuestas cortas y directas, sin introducción ni recapitulación.

```
/plugin install concise-mode@cockpit
```

![concise-mode](../previews/concise-mode.svg)

## `persona`

/persona cambia la voz de Claude: mentor, senior, rubberduck, pirata, yoda, zen.

```
/plugin install persona@cockpit
```

![persona](../previews/persona.svg)

## `prompt-shortcuts`

Los atajos ::fix, ::test, ::review, ::explain, ::refactor, ::doc, ::commit se vuelven prompts completos.

```
/plugin install prompt-shortcuts@cockpit
```

![prompt-shortcuts](../previews/prompt-shortcuts.svg)

## `tldr`

Añade un TL;DR de 2 frases (vía haiku) debajo de las respuestas largas.

```
/plugin install tldr@cockpit
```

![tldr](../previews/tldr.svg)

## `git-context`

Adjunta el estado de git (rama y archivos modificados) a cada prompt como contexto oculto.

```
/plugin install git-context@cockpit
```

![git-context](../previews/git-context.svg)

## `stack-context`

Detecta el stack del proyecto (package.json, pom.xml...) e informa a Claude en el system prompt.

```
/plugin install stack-context@cockpit
```

![stack-context](../previews/stack-context.svg)

## `commit-style`

Hace que Claude escriba commits en Conventional Commits, cortos y en imperativo.

```
/plugin install commit-style@cockpit
```

![commit-style](../previews/commit-style.svg)

## `reply-language`

Hace que Claude responda siempre en el idioma definido en el hub Cockpit, manteniendo código y comandos en el original.

```
/plugin install reply-language@cockpit
```

![reply-language](../previews/reply-language.svg)

## `time-context`

Cada prompt lleva la fecha, el día de la semana, la hora y el huso locales para resolver bien las fechas relativas.

```
/plugin install time-context@cockpit
```

![time-context](../previews/time-context.svg)

## `os-context`

Informa a Claude tu sistema operativo, shell y las versiones instaladas de node, python, java y git.

```
/plugin install os-context@cockpit
```

![os-context](../previews/os-context.svg)

## `test-first`

/tdd activa el trabajo test-first: una prueba que falla antes del código, ejecutada antes y después.

```
/plugin install test-first@cockpit
```

![test-first](../previews/test-first.svg)

## `explain-mode`

/explain hace que Claude explique cada cambio en una o dos frases, para quien aprende el código.

```
/plugin install explain-mode@cockpit
```

![explain-mode](../previews/explain-mode.svg)

## `plan-first`

/plan-first hace que Claude liste los archivos y el orden antes de editar un cambio en más de dos archivos.

```
/plugin install plan-first@cockpit
```

![plan-first](../previews/plan-first.svg)

## `no-comments`

Saca del código los comentarios que repiten el código, banners y código comentado; solo queda el porqué.

```
/plugin install no-comments@cockpit
```

![no-comments](../previews/no-comments.svg)

## `minimal-diff`

Pide el cambio más pequeño que resuelve el pedido, sin refactors de paso; lo que se note solo se menciona.

```
/plugin install minimal-diff@cockpit
```

![minimal-diff](../previews/minimal-diff.svg)

## `ask-first`

Cuando un pedido tiene dos lecturas que llevan a código distinto, Claude hace una pregunta corta antes.

```
/plugin install ask-first@cockpit
```

![ask-first](../previews/ask-first.svg)

## `verify-claims`

Claude no dice que algo funciona sin ejecutarlo, y termina diciendo qué se verificó y qué no.

```
/plugin install verify-claims@cockpit
```

![verify-claims](../previews/verify-claims.svg)

## `paste-fence`

Envuelve en un bloque de código el fragmento pegado de 6+ líneas de código o log antes de enviar, dejando tus frases fuera.

```
/plugin install paste-fence@cockpit
```

![paste-fence](../previews/paste-fence.svg)

## `file-mention-hint`

Cuando el prompt nombra un archivo sin ruta, añade las rutas rastreadas que coinciden para que Claude abra el archivo correcto.

```
/plugin install file-mention-hint@cockpit
```

![file-mention-hint](../previews/file-mention-hint.svg)

## `trace-helper`

Añade una pista oculta a los prompts con stack trace: hallar el primer frame del proyecto, leer el código y decir la causa raíz.

```
/plugin install trace-helper@cockpit
```

![trace-helper](../previews/trace-helper.svg)
