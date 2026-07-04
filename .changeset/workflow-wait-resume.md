---
"theazo": patch
---

Add workflow `wait` step type and `workflows.resumeRun()`. A `wait` step pauses a run until an external event is delivered (with optional `timeout`/`onTimeout`), and `resumeRun(runId, { event, payload })` resumes it by delivering that event. Exposed on the workflow builder via `.wait(id, { event, timeout?, onTimeout?, dependsOn? })`.
