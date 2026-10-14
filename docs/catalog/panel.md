# Always visible — 43 mods

[← Back to the README](../../README.md)

[`cockpit`](#cockpit) · [`git-band`](#git-band) · [`todo-band`](#todo-band) · [`usage-band`](#usage-band) · [`files-band`](#files-band) · [`error-band`](#error-band) · [`goal-band`](#goal-band) · [`agents-band`](#agents-band) · [`activity-status`](#activity-status) · [`test-status`](#test-status) · [`ci-status`](#ci-status) · [`stash-status`](#stash-status) · [`uncommitted-band`](#uncommitted-band) · [`pr-status`](#pr-status) · [`main-warning-band`](#main-warning-band) · [`conflict-band`](#conflict-band) · [`project-status`](#project-status) · [`ports-band`](#ports-band) · [`deps-status`](#deps-status) · [`todo-count-status`](#todo-count-status) · [`quality-status`](#quality-status) · [`model-status`](#model-status) · [`cost-ticker`](#cost-ticker) · [`idle-clock`](#idle-clock) · [`turn-progress`](#turn-progress) · [`last-prompt-band`](#last-prompt-band) · [`compact-nudge`](#compact-nudge) · [`session-diff-band`](#session-diff-band) · [`shield-band`](#shield-band) · [`reset-countdown`](#reset-countdown) · [`spend-today`](#spend-today) · [`focus-band`](#focus-band) · [`deadline-band`](#deadline-band) · [`pin-band`](#pin-band) · [`clock-status`](#clock-status) · [`day-timer`](#day-timer) · [`commits-today`](#commits-today) · [`dolar-status`](#dolar-status) · [`weather-status`](#weather-status) · [`api-status`](#api-status) · [`terminal-pet`](#terminal-pet) · [`runtime-band`](#runtime-band) · [`docker-band`](#docker-band)

## `cockpit`

Settings pane: /cockpit switches each panel on and off and sets the language of every mod.

```
/plugin install cockpit@cockpit
```

![cockpit](../previews/cockpit.svg)

## `git-band`

Band with the branch, changed files, lines added and removed, ahead/behind and the last commit.

```
/plugin install git-band@cockpit
```

![git-band](../previews/git-band.svg)

## `todo-band`

Project task list pinned above the prompt, clickable and persistent (/todo).

```
/plugin install todo-band@cockpit
```

![todo-band](../previews/todo-band.svg)

## `usage-band`

Fixed band with colored bars for context, the 5h and 7 day windows, and cost.

```
/plugin install usage-band@cockpit
```

![usage-band](../previews/usage-band.svg)

## `files-band`

Fixed band with the files Claude changed in this session.

```
/plugin install files-band@cockpit
```

![files-band](../previews/files-band.svg)

## `error-band`

Keeps the last failed command and its error line in view until a command passes.

```
/plugin install error-band@cockpit
```

![error-band](../previews/error-band.svg)

## `goal-band`

/goal pins the project goal above the prompt and in Claude's context.

```
/plugin install goal-band@cockpit
```

![goal-band](../previews/goal-band.svg)

## `agents-band`

Band showing in real time how many subagents are running and which ones.

```
/plugin install agents-band@cockpit
```

![agents-band](../previews/agents-band.svg)

## `activity-status`

Live status line with the tool Claude is running right now.

```
/plugin install activity-status@cockpit
```

![activity-status](../previews/activity-status.svg)

## `test-status`

Status line entry with the result of the last test run: passed or failed, time and duration.

```
/plugin install test-status@cockpit
```

![test-status](../previews/test-status.svg)

## `ci-status`

Status line with the state of the last GitHub Actions workflow (via gh).

```
/plugin install ci-status@cockpit
```

![ci-status](../previews/ci-status.svg)

## `stash-status`

Status line that reminds you how many stashes are saved.

```
/plugin install stash-status@cockpit
```

![stash-status](../previews/stash-status.svg)

## `uncommitted-band`

Warning band when changes have gone uncommitted for more than 45 minutes.

```
/plugin install uncommitted-band@cockpit
```

![uncommitted-band](../previews/uncommitted-band.svg)

## `pr-status`

Status line with the current branch pull request and its review state (via gh).

```
/plugin install pr-status@cockpit
```

![pr-status](../previews/pr-status.svg)

## `main-warning-band`

Red band while you are on main or master.

```
/plugin install main-warning-band@cockpit
```

![main-warning-band](../previews/main-warning-band.svg)

## `conflict-band`

Band that warns about a merge or rebase in progress and files in conflict.

```
/plugin install conflict-band@cockpit
```

![conflict-band](../previews/conflict-band.svg)

## `project-status`

Status line with the project name and version, Node version and package manager.

```
/plugin install project-status@cockpit
```

![project-status](../previews/project-status.svg)

## `ports-band`

Band with the dev servers running on localhost.

```
/plugin install ports-band@cockpit
```

![ports-band](../previews/ports-band.svg)

## `deps-status`

Status line with how many npm dependencies are outdated.

```
/plugin install deps-status@cockpit
```

![deps-status](../previews/deps-status.svg)

## `todo-count-status`

Status line counting TODO, FIXME and HACK in tracked code.

```
/plugin install todo-count-status@cockpit
```

![todo-count-status](../previews/todo-count-status.svg)

## `quality-status`

Status line with the latest lint, types and build results.

```
/plugin install quality-status@cockpit
```

![quality-status](../previews/quality-status.svg)

## `model-status`

Status line with the model in use in the session.

```
/plugin install model-status@cockpit
```

![model-status](../previews/model-status.svg)

## `cost-ticker`

Status line with the cost of the last turn and the session total.

```
/plugin install cost-ticker@cockpit
```

![cost-ticker](../previews/cost-ticker.svg)

## `idle-clock`

Status line with how long the session has been idle.

```
/plugin install idle-clock@cockpit
```

![idle-clock](../previews/idle-clock.svg)

## `turn-progress`

Live status line with the elapsed time and tool count of the turn in progress.

```
/plugin install turn-progress@cockpit
```

![turn-progress](../previews/turn-progress.svg)

## `last-prompt-band`

Band with your last request, so you do not lose it after long answers.

```
/plugin install last-prompt-band@cockpit
```

![last-prompt-band](../previews/last-prompt-band.svg)

## `compact-nudge`

Band with a compact button when context passes 75%.

```
/plugin install compact-nudge@cockpit
```

![compact-nudge](../previews/compact-nudge.svg)

## `session-diff-band`

Band with the total lines Claude wrote and removed in the session.

```
/plugin install session-diff-band@cockpit
```

![session-diff-band](../previews/session-diff-band.svg)

## `shield-band`

Band with the count of calls blocked by guards and the last reason.

```
/plugin install shield-band@cockpit
```

![shield-band](../previews/shield-band.svg)

## `reset-countdown`

Status line counting down to the reset of the tightest rate limit.

```
/plugin install reset-countdown@cockpit
```

![reset-countdown](../previews/reset-countdown.svg)

## `spend-today`

Status line with today's spend summed across all sessions.

```
/plugin install spend-today@cockpit
```

![spend-today](../previews/spend-today.svg)

## `focus-band`

/focus starts a focus block with a pinned progress bar.

```
/plugin install focus-band@cockpit
```

![focus-band](../previews/focus-band.svg)

## `deadline-band`

/deadline pins a countdown to the project deadline.

```
/plugin install deadline-band@cockpit
```

![deadline-band](../previews/deadline-band.svg)

## `pin-band`

/pin pins up to 4 project reminders above the prompt.

```
/plugin install pin-band@cockpit
```

![pin-band](../previews/pin-band.svg)

## `clock-status`

Status line with the day and time (useful in fullscreen mode).

```
/plugin install clock-status@cockpit
```

![clock-status](../previews/clock-status.svg)

## `day-timer`

Status line with your active Claude Code time today, summed across sessions.

```
/plugin install day-timer@cockpit
```

![day-timer](../previews/day-timer.svg)

## `commits-today`

Status line with how many commits you made today in this repository.

```
/plugin install commits-today@cockpit
```

![commits-today](../previews/commits-today.svg)

## `dolar-status`

Status line with the dollar rate in Brazilian reais (AwesomeAPI).

```
/plugin install dolar-status@cockpit
```

![dolar-status](../previews/dolar-status.svg)

## `weather-status`

Status line with the weather in your city (wttr.in).

```
/plugin install weather-status@cockpit
```

![weather-status](../previews/weather-status.svg)

## `api-status`

Status line with the state of the Anthropic API from its public status page.

```
/plugin install api-status@cockpit
```

![api-status](../previews/api-status.svg)

## `terminal-pet`

A mascot above the prompt that reacts: working, happy, sad or sleepy.

```
/plugin install terminal-pet@cockpit
```

![terminal-pet](../previews/terminal-pet.svg)

## `runtime-band`

Band that appears when the Node, Python or Java version the project asks for differs from the one installed.

```
/plugin install runtime-band@cockpit
```

![runtime-band](../previews/runtime-band.svg)

## `docker-band`

Band that warns when the Docker daemon is down or a compose stack has services stopped.

```
/plugin install docker-band@cockpit
```

![docker-band](../previews/docker-band.svg)
