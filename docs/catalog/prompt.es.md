# Prompt y modelo — 12 mods

[← Volver al README](../../README.es.md)

[`concise-mode`](#concise-mode) · [`persona`](#persona) · [`prompt-shortcuts`](#prompt-shortcuts) · [`tldr`](#tldr) · [`git-context`](#git-context) · [`stack-context`](#stack-context) · [`commit-style`](#commit-style) · [`reply-language`](#reply-language) · [`time-context`](#time-context) · [`os-context`](#os-context) · [`test-first`](#test-first) · [`explain-mode`](#explain-mode)

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
