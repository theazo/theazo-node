---
"theazo": patch
---

Reconcile SDK types with the `@theazo/contracts` single source and add the customizations surface:

- **Agents:** `AgentCreateOpts.model` is now `string` (dropped the never-accepted `AgentModelConfig` object form); added `mcp?: string[] | '*'`; `overrides` is now `Record<string, unknown>`.
- **Workflows:** `WorkflowCreateOpts` gains `concurrency?` and `plannerPolicy?`, and `name` is now optional (the API defaults it); added the `WorkflowResumeOpts` type used by `workflows.resumeRun()`.
- **Agent definitions:** the create/update field `instructions` is renamed to `systemPrompt` to match the platform data model. **Breaking for callers using `instructions`** — rename to `systemPrompt`.
- **Customizations (§3.17):** new `platform.instructions` / `platform.prompts` / `platform.skills` / `platform.hooks` namespaces plus `agents.attach` / `detach` / `attachments`, and their types.
