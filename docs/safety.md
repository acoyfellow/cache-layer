# Safety

`0.0.1` demonstrates routing; it does not execute arbitrary agent actions.

## Allowed demo input

- Public OSS context
- Dummy fixtures
- Public documentation questions
- Public CI/test-output summaries

## Escalated by design

- Private or internal source context
- Customer or personal data
- Secrets, tokens, credentials
- Edits, deployments, comments, merge actions, external writes
- Architecture and security judgment

## Model rule

Workers AI receives a candidate only after deterministic policy admits a read-only match. It may say `ESCALATE`; it cannot override the deterministic boundary to permit a risky request.

## Local mode

Ollama is the initial local-runtime target. Users remain responsible for their organizational AI-use and model-license policies.
