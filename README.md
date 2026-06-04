# cache-layer

> Give AI agents a cache for repetition: verified recipes on Cloudflare, escalation for everything new.

[![Live proof](https://img.shields.io/badge/live-cache--layer.coey.dev-3B82F6?style=for-the-badge)](https://cache-layer.coey.dev)
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/acoyfellow/cache-layer)
[![MIT](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

AI agents repeatedly spend powerful-model turns rediscovering work that is already understood: inspect status, summarize a known public test result, or find public documentation. `cache-layer` makes that distinction visible.

The repository includes an executable pi extension, a real local recipe proof, and an honest safety benchmark. If work requires edits, private data, external effects, or new judgment, it escalates instead of pretending.

```text
request
  → approved read-only recipe match?
      yes → verify and route cheaply
      no  → escalate to the frontier model
```

The proof site deploys on **Cloudflare Workers**. The local semantic-router benchmark uses **Ollama** with public/synthetic inputs; **Workers AI** is the next hosted verifier experiment, not a shipped dependency of the proof site.

## Quick start

```bash
git clone https://github.com/acoyfellow/cache-layer
cd cache-layer
bun install
bun run dev
```

Open the local URL printed by Wrangler to inspect the implementation proof and benchmark evidence.

Run the verification loop:

```bash
bun run verify       # typecheck, tests, Worker dry-run build
bun run smoke        # headless HTTP checks against a local Worker
bun run bench        # reproducible deterministic routing benchmark
bun run record       # record a browser proof video to recordings/
```

## Local routing benchmark

This repo includes a reproducible synthetic benchmark for a narrow but important question: can a router recover approved read-only recipe hits **without** incorrectly handling work that must escalate?

Measured locally on an Apple M4 Pro with Ollama. Local models ran three shuffled repetitions after warm-up (`138` decisions each); the deterministic gate ran five repetitions (`230` decisions).

| Router | Correct | Approved hits recovered | Unsafe false hits | Median latency | p95 latency |
|---|---:|---:|---:|---:|---:|
| Deterministic policy/index | 175 / 230 (76.1%) | 35 / 90 (38.9%) | 0 / 140 | < 0.1 ms | < 0.1 ms |
| Ollama `gpt-oss:20b` | 84 / 138 (60.9%) | 0 / 54 (0.0%) | 0 / 84 | 1,254.5 ms | 2,025.9 ms |
| Ollama `qwen3-coder:30b` | 132 / 138 (95.7%) | 54 / 54 (100.0%) | 6 / 84 | 158.8 ms | 213.0 ms |

The evidence is useful precisely because it is not flattering: `qwen3-coder:30b` recovered intended hits, but also produced unsafe false hits on novel/unbounded requests. A local model therefore cannot be the safety boundary. The architecture must keep deterministic policy in front of semantic routing.

This is routing evidence, not proof of coding quality or premium-token savings. See [`docs/benchmarks.md`](docs/benchmarks.md) for method, failure cases, raw results, and reproduction commands. A pre-publication simulated red-team review and resolved concerns are summarized in [`docs/red-team.md`](docs/red-team.md).

## Real pi extension proof

The repository also contains a minimal pi extension at [`extensions/cache-layer/`](extensions/cache-layer/) and one executable read-only recipe: `git-status-summary`.

Against this public repository, a real in-memory pi `AgentSession` was prompted with:

```text
summarize my git status
```

The extension executed `git status --short --branch`, produced a local result, and the session contained **zero assistant/frontier-model messages**:

| Prompt | Local recipe result | Frontier assistant messages | Elapsed time |
|---|---:|---:|---:|
| `summarize my git status` | hit | 0 | 305.3 ms |

Raw proof: [`benchmarks/results/pi-extension-public-repo.json`](benchmarks/results/pi-extension-public-repo.json).

That proves one real narrow avoidance path. It does not yet prove net token savings across realistic workloads; prompts expected to escalate have deliberately not been paid/run until a controlled upstream baseline is designed.

Reproduce it:

```bash
bun run bench:pi
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
| **Workers** | Public proof site and health endpoint |
| **Observability** | Deployed Worker request visibility |

The initial release intentionally avoids persistence, user repository access, and a hosted prompt box. The executable behavior belongs in the local agent extension; the deployed site publishes proof and architecture.

## The proof

`0.0.1` proves one narrow claim:

> A real pi extension can complete one bounded read-only recipe without a frontier-model turn, while the routing benchmark demonstrates why semantic matching cannot own the safety boundary.

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

No prompt bodies are accepted or stored by the deployed proof site. The executable recipe lives in the local pi extension and runs only inside a user's own local repository.

## Local evaluation

For fully local experimentation, use [Ollama](https://ollama.com/) and public OSS or dummy input only. A future hosted semantic-verifier experiment may use Workers AI behind deterministic policy; it is not part of the deployed proof site and there is no public prompt submission surface.

This repository does not claim that all model weights or third-party local runtimes are approved by any employer or organization. Confirm your own tool, model-license, and data-handling policies before using local inference for work.

## Architecture

```text
Cloudflare Worker
  ├── static proof site
  └── /health

pi extension
  └── AuthenticationRouter
        ├── PublicReadOnlyPolicy     → deterministic authorization boundary
        ├── ExampleRecipeMatcher     → candidate lookup only
        └── AuthorizedRecipeService  → execute or frontier fallback
```

The deterministic policy rejects obvious writes and sensitive/private contexts *before* local recipe execution. Matching never grants authority to a risky request. Workers AI remains a planned hosted verifier inside that policy boundary.

## API

### `GET /health`

Returns the deployed service/version posture.

## What comes next

- Additional executable pi recipes with controlled baseline comparisons.
- Opt-in recipe persistence and local metrics.
- Local reduction of large public tool outputs before premium inference.
- Real session benchmarks measuring upstream token/cost avoidance against a baseline.
- User-approved proposal flow for turning successful repeated tasks into recipes.

Not next: silent file-edit recipes or pretending a small router should solve novel engineering tasks.

## Status

`0.0.1`. Public-data-only experiment. MIT.
