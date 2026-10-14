# Interface — 30 mods

[← Back to the README](../../README.md)

[`turn-timer`](#turn-timer) · [`tool-tally`](#tool-tally) · [`file-trail`](#file-trail) · [`cmd-log`](#cmd-log) · [`git-status-line`](#git-status-line) · [`context-meter`](#context-meter) · [`rate-limit-watch`](#rate-limit-watch) · [`session-clock`](#session-clock) · [`diff-pane`](#diff-pane) · [`turn-history`](#turn-history) · [`prompt-history`](#prompt-history) · [`agent-pane`](#agent-pane) · [`token-chart`](#token-chart) · [`cost-pane`](#cost-pane) · [`error-pane`](#error-pane) · [`context-pane`](#context-pane) · [`read-pane`](#read-pane) · [`links-pane`](#links-pane) · [`git-pane`](#git-pane) · [`branch-pane`](#branch-pane) · [`stash-pane`](#stash-pane) · [`code-todo-pane`](#code-todo-pane) · [`deps-pane`](#deps-pane) · [`scripts-pane`](#scripts-pane) · [`env-keys-pane`](#env-keys-pane) · [`test-pane`](#test-pane) · [`slow-toast`](#slow-toast) · [`deny-toast`](#deny-toast) · [`big-output-toast`](#big-output-toast) · [`timeline`](#timeline)

## `turn-timer`

Band above the prompt with duration, tools and tokens of the last turn.

```
/plugin install turn-timer@cockpit
```

![turn-timer](../previews/turn-timer.svg)

## `tool-tally`

/tally opens a pane with the call count per tool.

```
/plugin install tool-tally@cockpit
```

![tool-tally](../previews/tool-tally.svg)

## `file-trail`

/trail opens a pane with the files read and changed in the session.

```
/plugin install file-trail@cockpit
```

![file-trail](../previews/file-trail.svg)

## `cmd-log`

/cmdlog opens a pane with the shell commands, status and duration.

```
/plugin install cmd-log@cockpit
```

![cmd-log](../previews/cmd-log.svg)

## `git-status-line`

Status line with branch, changed files and commits ahead/behind.

```
/plugin install git-status-line@cockpit
```

![git-status-line](../previews/git-status-line.svg)

## `context-meter`

Status line with a context bar and cost; warns at 80% and 90%.

```
/plugin install context-meter@cockpit
```

![context-meter](../previews/context-meter.svg)

## `rate-limit-watch`

Toast when the 5h or 7-day window passes 75/90/95%; /limits lists the usage.

```
/plugin install rate-limit-watch@cockpit
```

![rate-limit-watch](../previews/rate-limit-watch.svg)

## `session-clock`

Status line with session time and number of prompts.

```
/plugin install session-clock@cockpit
```

![session-clock](../previews/session-clock.svg)

## `diff-pane`

/edits opens a pane with every Edit and Write of the session, lines added and removed, newest first.

```
/plugin install diff-pane@cockpit
```

![diff-pane](../previews/diff-pane.svg)

## `turn-history`

/turns opens a pane with one row per finished turn: duration, tool calls, output tokens and a cross for failed ones.

```
/plugin install turn-history@cockpit
```

![turn-history](../previews/turn-history.svg)

## `prompt-history`

/prompts opens a pane with the prompts you typed this session; press one to put it back in the prompt box.

```
/plugin install prompt-history@cockpit
```

![prompt-history](../previews/prompt-history.svg)

## `agent-pane`

/crew opens a pane with the session's subagents, their type and status, refreshed while any is running.

```
/plugin install agent-pane@cockpit
```

![agent-pane](../previews/agent-pane.svg)

## `token-chart`

/tokens opens a pane with output tokens per turn as thin gauges scaled to the largest turn.

```
/plugin install token-chart@cockpit
```

![token-chart](../previews/token-chart.svg)

## `cost-pane`

/spend opens a pane with the cost of each turn, the difference of the session cost, and the total.

```
/plugin install cost-pane@cockpit
```

![cost-pane](../previews/cost-pane.svg)

## `error-pane`

/errors opens a pane with every tool call that failed or was denied, its input and the first line of the error.

```
/plugin install error-pane@cockpit
```

![error-pane](../previews/error-pane.svg)

## `context-pane`

/window opens a pane with the context window by category, each with a gauge and its share, and a Refresh button.

```
/plugin install context-pane@cockpit
```

![context-pane](../previews/context-pane.svg)

## `read-pane`

/reads opens a pane with the files read this session and how often; files read 3 or more times are flagged as wasted context.

```
/plugin install read-pane@cockpit
```

![read-pane](../previews/read-pane.svg)

## `links-pane`

/links opens a pane with the URLs that appeared in Claude's answers; press one to copy it.

```
/plugin install links-pane@cockpit
```

![links-pane](../previews/links-pane.svg)

## `git-pane`

/repo opens a pane with the branch, ahead and behind, the changed files and the last 8 commits.

```
/plugin install git-pane@cockpit
```

![git-pane](../previews/git-pane.svg)

## `branch-pane`

/branches opens a pane with the local branches, the current one marked, ahead and behind and the age of the last commit.

```
/plugin install branch-pane@cockpit
```

![branch-pane](../previews/branch-pane.svg)

## `stash-pane`

/stashes opens a pane with the stash list: index, branch, message and how old each one is.

```
/plugin install stash-pane@cockpit
```

![stash-pane](../previews/stash-pane.svg)

## `code-todo-pane`

/codetodo opens a pane with the TODO, FIXME and HACK lines in tracked files, grouped by tag.

```
/plugin install code-todo-pane@cockpit
```

![code-todo-pane](../previews/code-todo-pane.svg)

## `deps-pane`

/deps opens a pane with npm outdated as a table, major jumps in red and minor ones in amber.

```
/plugin install deps-pane@cockpit
```

![deps-pane](../previews/deps-pane.svg)

## `scripts-pane`

/scripts opens a pane with the scripts of package.json; pressing one asks Claude to run it and fix what fails.

```
/plugin install scripts-pane@cockpit
```

![scripts-pane](../previews/scripts-pane.svg)

## `env-keys-pane`

/envkeys compares the keys of .env.example with .env and lists the missing and the extra ones, never a value.

```
/plugin install env-keys-pane@cockpit
```

![env-keys-pane](../previews/env-keys-pane.svg)

## `test-pane`

/testlog opens a pane with every test run of the session: command, pass or fail, duration and time.

```
/plugin install test-pane@cockpit
```

![test-pane](../previews/test-pane.svg)

## `slow-toast`

A toast when a shell command took a minute or more, with the command and how long it ran.

```
/plugin install slow-toast@cockpit
```

![slow-toast](../previews/slow-toast.svg)

## `deny-toast`

A toast whenever a tool call is refused, naming the tool and the first line of the reason.

```
/plugin install deny-toast@cockpit
```

![deny-toast](../previews/deny-toast.svg)

## `big-output-toast`

A toast when one tool result is larger than 20,000 characters, since that much output eats the context.

```
/plugin install big-output-toast@cockpit
```

![big-output-toast](../previews/big-output-toast.svg)

## `timeline`

/timeline opens a chronological log of the session: prompts, tool calls, failures and turn ends with their clock time.

```
/plugin install timeline@cockpit
```

![timeline](../previews/timeline.svg)
