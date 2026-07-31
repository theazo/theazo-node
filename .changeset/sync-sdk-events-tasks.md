---
"theazo": patch
---

Re-sync SDK source from the main monorepo (packages/sdk/src). Adds the `events` namespace (`theazo.events.emit()`, agent-definition `.on()` event triggers) and `Billing*` types, both previously missing entirely. Fixes `session.tasks.get()`/`.wait()`/`.cancel()` to call the correct globally-unique `/v1/tasks/:id` routes (they were still calling the old, now-invalid session-scoped `/v1/sessions/:id/tasks/:id` path); `.submit()`/`.list()` remain session-scoped, unchanged. Also widens `guardrails.violations()` filters to include `type`/`severity`/`limit` (previously `period` only).
