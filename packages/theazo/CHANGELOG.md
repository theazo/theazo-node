# theazo

## 0.1.8

### Patch Changes

- 732bb6a: Re-sync SDK source from the main monorepo (packages/sdk/src). Adds the `events` namespace (`theazo.events.emit()`, agent-definition `.on()` event triggers) and `Billing*` types, both previously missing entirely. Fixes `session.tasks.get()`/`.wait()`/`.cancel()` to call the correct globally-unique `/v1/tasks/:id` routes (they were still calling the old, now-invalid session-scoped `/v1/sessions/:id/tasks/:id` path); `.submit()`/`.list()` remain session-scoped, unchanged. Also widens `guardrails.violations()` filters to include `type`/`severity`/`limit` (previously `period` only).

## 0.1.7

### Patch Changes

- 42bec38: Add workflow `wait` step type and `workflows.resumeRun()`. A `wait` step pauses a run until an external event is delivered (with optional `timeout`/`onTimeout`), and `resumeRun(runId, { event, payload })` resumes it by delivering that event. Exposed on the workflow builder via `.wait(id, { event, timeout?, onTimeout?, dependsOn? })`.

## 0.1.6

### Patch Changes

- Fix `agent.stream()` race condition: open SSE connection before triggering run to ensure no events are missed

## 0.1.5

### Patch Changes

- Fix `fleet.status()` route: `/v1/fleets/:id/status` -> `/v1/fleets/:id`

## 0.1.4

### Patch Changes

- Fix `agent.files.read()` to use path parameter instead of query parameter

## 0.1.3

### Patch Changes

- Fix remaining SDK route and method issues:

  - Fix `updateDefinition` to use PUT instead of PATCH
  - Fix `agent.run()` to normalize nullable `toolCalls` to empty array
  - Fix `agent.files.list()` route: `/files/list` -> `/files`
  - Fix `team.run()` to poll async team runs until completion

## 0.1.2

### Patch Changes

- Sync SDK with platform monorepo:

  - Fix `agent.exec()` param rename: `lang` -> `language`
  - Fix agent definition routes: `/v1/agents/definitions` -> `/v1/agent-definitions`
  - Fix `updateDefinition` to use PUT instead of PATCH
  - Fix `agent.run()` to normalize nullable `toolCalls` to empty array
  - Fix `agent.files.list()` route: `/files/list` -> `/files`
  - Fix `session.agents.list()` to handle both `{ data: [] }` and raw array responses
  - Fix `team.run()` to poll async team runs until completion
  - Update `BillingPlan` type: `cloud` -> `pro`
  - Allow nullable `toolCalls` in `RunResult` type

## 0.1.1

### Patch Changes

- 95744dd: Update package description, keywords, and README for npm
