# Commands — 32 mods

[← Back to the README](../../README.md)

[`quick-notes`](#quick-notes) · [`pomodoro`](#pomodoro) · [`copy-last`](#copy-last) · [`session-stats`](#session-stats) · [`quote-selection`](#quote-selection) · [`git-peek`](#git-peek) · [`git-branch`](#git-branch) · [`git-stash`](#git-stash) · [`git-undo`](#git-undo) · [`run-script`](#run-script) · [`open-path`](#open-path) · [`ports`](#ports) · [`kill-port`](#kill-port) · [`tree`](#tree) · [`find-file`](#find-file) · [`last-error`](#last-error) · [`env-check`](#env-check) · [`outdated`](#outdated) · [`json-tool`](#json-tool) · [`uuid`](#uuid) · [`timestamp`](#timestamp) · [`base64`](#base64) · [`hash`](#hash) · [`calc`](#calc) · [`color-tool`](#color-tool) · [`regex-test`](#regex-test) · [`http-probe`](#http-probe) · [`snippets`](#snippets) · [`export-session`](#export-session) · [`standup`](#standup) · [`loc-count`](#loc-count) · [`big-files`](#big-files)

## `quick-notes`

/note and /notes: quick notes per project, kept between sessions.

```
/plugin install quick-notes@cockpit
```

![quick-notes](../previews/quick-notes.svg)

## `pomodoro`

/pomodoro [min] with a countdown in the status line, toast and notification at the end.

```
/plugin install pomodoro@cockpit
```

![pomodoro](../previews/pomodoro.svg)

## `copy-last`

/copy-last copies the last reply; /copy-code copies the last code block.

```
/plugin install copy-last@cockpit
```

![copy-last](../previews/copy-last.svg)

## `session-stats`

/stats sums up the session: time, prompts, tools, tokens, context and cost.

```
/plugin install session-stats@cockpit
```

![session-stats](../previews/session-stats.svg)

## `quote-selection`

/quote quotes in the prompt the passage selected with the mouse.

```
/plugin install quote-selection@cockpit
```

![quote-selection](../previews/quote-selection.svg)

## `git-peek`

/gs, /gl and /gd: git status, log and diff right away, without spending a model turn.

```
/plugin install git-peek@cockpit
```

![git-peek](../previews/git-peek.svg)

## `git-branch`

/gb lists local branches with the current one marked, or switches to a branch and creates it when missing.

```
/plugin install git-branch@cockpit
```

![git-branch](../previews/git-branch.svg)

## `git-stash`

/gst stashes the working tree with a message, pops the latest stash after asking, or lists the stashes.

```
/plugin install git-stash@cockpit
```

![git-stash](../previews/git-stash.svg)

## `git-undo`

/gundo shows the last commit and, once you confirm, undoes it with a soft reset; refuses a pushed commit.

```
/plugin install git-undo@cockpit
```

![git-undo](../previews/git-undo.svg)

## `run-script`

/run runs a package.json script with the project's package manager and prints the exit code and last lines.

```
/plugin install run-script@cockpit
```

![run-script](../previews/run-script.svg)

## `open-path`

/open opens a file or folder of the project in the system's default app; refuses paths outside the project.

```
/plugin install open-path@cockpit
```

![open-path](../previews/open-path.svg)

## `ports`

/ports probes the common dev ports on localhost and lists which ones answer.

```
/plugin install ports@cockpit
```

![ports](../previews/ports.svg)

## `kill-port`

/killport finds the process listening on a port, names it and ends it after you confirm.

```
/plugin install kill-port@cockpit
```

![kill-port](../previews/kill-port.svg)

## `tree`

/tree prints the project's directory tree two levels deep, skipping node_modules, .git, build output and dot folders.

```
/plugin install tree@cockpit
```

![tree](../previews/tree.svg)

## `find-file`

/ff lists the tracked files whose path contains a text, best matches first.

```
/plugin install find-file@cockpit
```

![find-file](../previews/find-file.svg)

## `last-error`

/lasterr recalls the most recent shell command that failed this session and the end of its output.

```
/plugin install last-error@cockpit
```

![last-error](../previews/last-error.svg)

## `env-check`

/envcheck compares the keys of .env.example with .env and lists the missing and extra ones, never a value.

```
/plugin install env-check@cockpit
```

![env-check](../previews/env-check.svg)

## `outdated`

/outdated shows npm outdated as an aligned table and counts the major version jumps.

```
/plugin install outdated@cockpit
```

![outdated](../previews/outdated.svg)

## `json-tool`

/json validates and pretty-prints JSON, and says the line and column of a syntax error.

```
/plugin install json-tool@cockpit
```

![json-tool](../previews/json-tool.svg)

## `uuid`

/uuid generates up to 20 random UUIDs and copies them to the clipboard.

```
/plugin install uuid@cockpit
```

![uuid](../previews/uuid.svg)

## `timestamp`

/ts converts epoch seconds, milliseconds, ISO 8601 and local time for now or for any epoch or date.

```
/plugin install timestamp@cockpit
```

![timestamp](../previews/timestamp.svg)

## `base64`

/b64 encodes and decodes Base64 safely for UTF-8 text and copies the result.

```
/plugin install base64@cockpit
```

![base64](../previews/base64.svg)

## `hash`

/hash gives the SHA-256 and SHA-1 of a text in hex and copies the SHA-256.

```
/plugin install hash@cockpit
```

![hash](../previews/hash.svg)

## `calc`

/calc evaluates arithmetic with parentheses and decimals, and says what is wrong with a bad expression.

```
/plugin install calc@cockpit
```

![calc](../previews/calc.svg)

## `color-tool`

/color converts a color between hex, rgb and hsl and reports its WCAG contrast on white and black.

```
/plugin install color-tool@cockpit
```

![color-tool](../previews/color-tool.svg)

## `regex-test`

/re tests a regular expression on a text and lists each match with its position and capture groups.

```
/plugin install regex-test@cockpit
```

![regex-test](../previews/regex-test.svg)

## `http-probe`

/http makes a GET request and shows the status, content type, size and first lines of the body.

```
/plugin install http-probe@cockpit
```

![http-probe](../previews/http-probe.svg)

## `snippets`

/snip saves reusable prompt snippets across sessions and puts one in the prompt box by name.

```
/plugin install snippets@cockpit
```

![snippets](../previews/snippets.svg)

## `export-session`

/save-session writes the conversation so far as Markdown under .claude-exports in the project.

```
/plugin install export-session@cockpit
```

![export-session](../previews/export-session.svg)

## `standup`

/standup lists your commits since yesterday morning in this repository, grouped by day and ready to paste.

```
/plugin install standup@cockpit
```

![standup](../previews/standup.svg)

## `loc-count`

/loc counts lines of code by file type for the project or a path, with a total.

```
/plugin install loc-count@cockpit
```

![loc-count](../previews/loc-count.svg)

## `big-files`

/big lists the largest tracked files of the project with readable sizes.

```
/plugin install big-files@cockpit
```

![big-files](../previews/big-files.svg)
