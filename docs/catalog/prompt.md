# Prompt and model — 22 mods

[← Back to the README](../../README.md)

[`concise-mode`](#concise-mode) · [`persona`](#persona) · [`prompt-shortcuts`](#prompt-shortcuts) · [`tldr`](#tldr) · [`git-context`](#git-context) · [`stack-context`](#stack-context) · [`commit-style`](#commit-style) · [`reply-language`](#reply-language) · [`time-context`](#time-context) · [`os-context`](#os-context) · [`test-first`](#test-first) · [`explain-mode`](#explain-mode) · [`plan-first`](#plan-first) · [`no-comments`](#no-comments) · [`minimal-diff`](#minimal-diff) · [`ask-first`](#ask-first) · [`verify-claims`](#verify-claims) · [`paste-fence`](#paste-fence) · [`file-mention-hint`](#file-mention-hint) · [`trace-helper`](#trace-helper) · [`branch-naming`](#branch-naming) · [`pr-style`](#pr-style)

## `concise-mode`

/concise turns on short, direct answers, with no introduction or recap.

```
/plugin install concise-mode@cockpit
```

![concise-mode](../previews/concise-mode.svg)

## `persona`

/persona changes Claude's voice: mentor, senior, rubberduck, pirata, yoda, zen.

```
/plugin install persona@cockpit
```

![persona](../previews/persona.svg)

## `prompt-shortcuts`

Shortcuts ::fix, ::test, ::review, ::explain, ::refactor, ::doc, ::commit become full prompts.

```
/plugin install prompt-shortcuts@cockpit
```

![prompt-shortcuts](../previews/prompt-shortcuts.svg)

## `tldr`

Adds a 2-sentence TL;DR (via haiku) below long answers.

```
/plugin install tldr@cockpit
```

![tldr](../previews/tldr.svg)

## `git-context`

Attaches the git state (branch and changed files) to every prompt as hidden context.

```
/plugin install git-context@cockpit
```

![git-context](../previews/git-context.svg)

## `stack-context`

Detects the project stack (package.json, pom.xml...) and tells Claude in the system prompt.

```
/plugin install stack-context@cockpit
```

![stack-context](../previews/stack-context.svg)

## `commit-style`

Makes Claude write short, imperative Conventional Commits.

```
/plugin install commit-style@cockpit
```

![commit-style](../previews/commit-style.svg)

## `reply-language`

Makes Claude always answer in the language set in the Cockpit hub, keeping code and commands in the original.

```
/plugin install reply-language@cockpit
```

![reply-language](../previews/reply-language.svg)

## `time-context`

Every prompt carries the current local date, weekday, time and UTC offset so relative dates resolve right.

```
/plugin install time-context@cockpit
```

![time-context](../previews/time-context.svg)

## `os-context`

Tells Claude your operating system, shell and installed node, python, java and git versions.

```
/plugin install os-context@cockpit
```

![os-context](../previews/os-context.svg)

## `test-first`

/tdd turns on test-first work: a failing test before the code, run before and after.

```
/plugin install test-first@cockpit
```

![test-first](../previews/test-first.svg)

## `explain-mode`

/explain makes Claude explain each change in one or two sentences, for someone learning the codebase.

```
/plugin install explain-mode@cockpit
```

![explain-mode](../previews/explain-mode.svg)

## `plan-first`

/plan-first makes Claude list the files and the order before editing a change that spans more than two files.

```
/plugin install plan-first@cockpit
```

![plan-first](../previews/plan-first.svg)

## `no-comments`

Keeps comments that restate the code, banners and commented-out code out; only the why stays.

```
/plugin install no-comments@cockpit
```

![no-comments](../previews/no-comments.svg)

## `minimal-diff`

Asks for the smallest change that solves the request, with no drive-by refactors; findings are mentioned instead.

```
/plugin install minimal-diff@cockpit
```

![minimal-diff](../previews/minimal-diff.svg)

## `ask-first`

When a request has two readings that lead to different code, Claude asks one short question first.

```
/plugin install ask-first@cockpit
```

![ask-first](../previews/ask-first.svg)

## `verify-claims`

Claude does not say something works without running it, and ends with what was and was not verified.

```
/plugin install verify-claims@cockpit
```

![verify-claims](../previews/verify-claims.svg)

## `paste-fence`

Wraps a pasted block of 6+ lines of code or logs in a code fence before it is sent, leaving your sentences outside.

```
/plugin install paste-fence@cockpit
```

![paste-fence](../previews/paste-fence.svg)

## `file-mention-hint`

When a prompt names a file without a path, adds the matching tracked paths so Claude opens the right file first.

```
/plugin install file-mention-hint@cockpit
```

![file-mention-hint](../previews/file-mention-hint.svg)

## `trace-helper`

Adds a hidden hint to prompts with a stack trace: find the first project frame, read it, state the root cause.

```
/plugin install trace-helper@cockpit
```

![trace-helper](../previews/trace-helper.svg)

## `branch-naming`

Teaches Claude the branch naming convention: feat/, fix/, chore/, refactor/, docs/ and never new work on main.

```
/plugin install branch-naming@cockpit
```

![branch-naming](../previews/branch-naming.svg)

## `pr-style`

Makes pull request descriptions follow what changed, why, how tested and risks, with a Conventional Commits title.

```
/plugin install pr-style@cockpit
```

![pr-style](../previews/pr-style.svg)
