---
"theazo": patch
---

Add the `theazo.secrets` and `theazo.models` namespaces, and extend BYOI compute config:

- **`theazo.secrets`** — org-wide secrets (platform-level, shared across sessions): `set(kv)`, `list()`, `delete(name)`. (Session-scoped secrets remain on `session.secrets`.)
- **`theazo.models`** — the model catalog: `list()`, `get(id)`, `estimate({ model, inputTokens, outputTokens })`, with `Model` / `ModelEstimate` types.
- **BYOI compute config** — `TheazoConfig.compute` and `ComputeProviderConfig` now accept `credentialRef` (a secret ref) and `endpoint` (for webhook/custom compute), matching the model config and the provider-config API.
