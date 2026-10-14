# Focus and notifications — 9 mods

[← Back to the README](../../README.md)

[`turn-notify`](#turn-notify) · [`break-reminder`](#break-reminder) · [`daily-streak`](#daily-streak) · [`error-notify`](#error-notify) · [`needs-you-notify`](#needs-you-notify) · [`agent-done-notify`](#agent-done-notify) · [`long-cmd-notify`](#long-cmd-notify) · [`tests-notify`](#tests-notify) · [`ci-notify`](#ci-notify)

## `turn-notify`

Native notification when a turn of 30s or more finishes.

```
/plugin install turn-notify@cockpit
```

![turn-notify](../previews/turn-notify.svg)

## `break-reminder`

A toast every 50 minutes of session reminding you to take a break.

```
/plugin install break-reminder@cockpit
```

![break-reminder](../previews/break-reminder.svg)

## `daily-streak`

Counts your streak of days using Claude Code; a toast on start and the /streak command.

```
/plugin install daily-streak@cockpit
```

![daily-streak](../previews/daily-streak.svg)

## `error-notify`

Sends a native notification when a turn ends on an error or a refusal.

```
/plugin install error-notify@cockpit
```

![error-notify](../previews/error-notify.svg)

## `needs-you-notify`

Sends a native notification when Claude stops to ask you a question or needs your permission.

```
/plugin install needs-you-notify@cockpit
```

![needs-you-notify](../previews/needs-you-notify.svg)

## `agent-done-notify`

Sends a native notification when a subagent that ran for 30 seconds or more finishes.

```
/plugin install agent-done-notify@cockpit
```

![agent-done-notify](../previews/agent-done-notify.svg)

## `long-cmd-notify`

Sends a native notification when a shell command that ran two minutes or more finishes.

```
/plugin install long-cmd-notify@cockpit
```

![long-cmd-notify](../previews/long-cmd-notify.svg)

## `tests-notify`

Sends a native notification with pass or fail when a test run of 30 seconds or more finishes.

```
/plugin install tests-notify@cockpit
```

![tests-notify](../previews/tests-notify.svg)

## `ci-notify`

Polls GitHub Actions every two minutes and notifies once when a running workflow completes.

```
/plugin install ci-notify@cockpit
```

![ci-notify](../previews/ci-notify.svg)
