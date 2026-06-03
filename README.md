# cache-layer

> Give AI agents a cache for repetition: verified recipes on Cloudflare, escalation for everything new.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/acoyfellow/cache-layer)
[![MIT](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

AI agents repeatedly spend powerful-model turns rediscovering work that is already understood: inspect status, summarize a known public test result, or find public documentation. `cache-layer` makes that distinction visible.

Type an agent task. If it matches an approved, read-only recipe, the router explains the local path. If it requires edits, private data, external effects, or new judgment, it escalates instead of pretending.

```text
request
  → approved read-only recipe match?
      yes → verify and route cheaply
      no  → escalate to the frontier model
```

Built with **Cloudflare Workers** and **Workers AI**. Optional local evaluation can use **Ollama** with public OSS or dummy data.

## Quick start

```bash
git clone https://github.com/acoyfellow/cache-layer
cd cache-layer
bun install
bun run dev
```

Open the local URL printed by Wrangler, then try:

```text
summarize my git status
refactor the authentication architecture
inspect a customer token from our private repo
```

The first request matches a bounded read-only recipe. The other two escalate visibly.

Run the verification loop:

```bash
bun run verify       # typecheck, tests, Worker dry-run build
bun run smoke        # headless HTTP checks against a local Worker
bun run record       # record a browser proof video to recordings/
```

## Deploy your own

Click **Deploy to Cloudflare** above, or deploy from a checkout:

```bash
bun install
bun run deploy
```

The app uses:

| Primitive | Purpose |
|---|---|
| **Workers** | UI assets and routing API |
| **Workers AI** | Conservative confirmation of candidate read-only matches |
| **Observability** | Deployed Worker request visibility |

The initial release intentionally avoids persistence and user repository access. There is no reason to add a database before the public-data routing demo is useful.

## The demo

`0.0.1` proves one narrow claim:

> A safe repeated agent intent can be routed through an explicit recipe, while ambiguous or risky work escalates honestly.

Example safe recipe:

```yaml
id: git-status-summary
risk: read_only
handles:
  - summarize my git status
  - what changed locally?
proof:
  - runs read-only git inspection
  - modifies no files
  - makes no remote calls
fallback: escalate
```

Example escalation:

```text
refactor the authentication architecture
→ ESCALATE
  novel, write-capable, or judgment-heavy work is outside the read-only cache boundary
```

## Safety boundary

This project is deliberately conservative.

| Request type | `0.0.1` behavior |
|---|---|
| Public, read-only, objectively bounded workflow | May route to a verified recipe |
| Public or dummy output summarization | May route locally |
| Source edits, commits, deploys, comments, external actions | Escalate |
| Private repositories, non-public code, secrets, customer or personal data | Escalate |
| Architecture or security judgment | Escalate |
| No high-confidence match | Escalate |

No prompt bodies are stored by this starter. No local recipe executes shell commands from the hosted demo. The UI illustrates the route and its policy boundary.

## Local evaluation

For fully local experimentation, use [Ollama](https://ollama.com/) and public OSS or dummy input only. The deployed web demo uses Workers AI so that anyone can reproduce the architecture on Cloudflare.

This repository does not claim that all model weights or third-party local runtimes are approved by any employer or organization. Confirm your own tool, model-license, and data-handling policies before using local inference for work.

## Architecture

```text
browser
  │
  ▼
Cloudflare Worker
  ├── static demo UI
  ├── deterministic safety gate
  ├── approved read-only recipe index
  └── Workers AI confirmation for candidate hits
          │
          ├── KEEP      → recipe hit shown with evidence
          └── ESCALATE  → upstream/model handoff recommended
```

The deterministic gate rejects obvious writes and sensitive/private contexts *before* the Workers AI confirmation step. A model cannot opt a risky request into a safe recipe.

## API

### `POST /api/route`

```bash
curl -s http://localhost:8791/api/route \
  -H 'content-type: application/json' \
  -d '{"prompt":"summarize my git status"}'
```

Response:

```json
{
  "route": "recipe_hit",
  "confidence": 1,
  "reason": "Matched an approved read-only recipe with inspectable evidence.",
  "recipe": {
    "id": "git-status-summary",
    "risk": "read-only"
  }
}
```

### `GET /api/recipes`

Lists the public recipe definitions presented by the demo.

### `GET /health`

Returns the deployed service/version posture.

## What comes next

- A pi extension that performs the same transparent route before an agent turn.
- Opt-in recipe persistence and local metrics.
- Local reduction of large public tool outputs before premium inference.
- User-approved proposal flow for turning successful repeated tasks into recipes.

Not next: silent file-edit recipes or pretending a small router should solve novel engineering tasks.

## Status

`0.0.1`. Public-data-only experiment. MIT.
