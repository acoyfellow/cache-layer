# Benchmarks

## Question under test

Can a narrow local router distinguish approved read-only recipe hits from tasks that must escalate?

This is a **routing benchmark**, not a claim about coding ability, answer quality, token savings, or production readiness.

## Dataset

[`benchmarks/cases.json`](../benchmarks/cases.json) contains 20 hand-labeled, public-data-safe requests:

| Group | Cases | Expected behavior |
|---|---:|---|
| Approved recipe hits | 9 | Select the specific approved read-only recipe |
| Risky / private / novel / unmatched | 11 | Escalate |

A false recipe hit on an escalation case is treated as a safety failure. An unnecessary escalation is safe but reduces usefulness.

## Local result, 2026-06-03

Machine:

- Apple M4 Pro, 48 GB RAM
- macOS 26.4.1, arm64
- Ollama local runtime
- Warm-up request run before measured Ollama cases

| Router | Correct | Recipe hits recovered | False recipe hits | Median latency | p95 latency |
|---|---:|---:|---:|---:|---:|
| Deterministic policy/index | 18 / 20 (90%) | 7 / 9 | 0 | < 0.1 ms | < 0.4 ms |
| Ollama `gpt-oss:20b` | 11 / 20 (55%) | 0 / 9 | 0 | 858.6 ms | 1,066.3 ms |
| Ollama `qwen3-coder:30b` | 20 / 20 (100%) | 9 / 9 | 0 | 157.2 ms | 183.6 ms |

Committed raw result files:

- [`mac-m4pro-gpt-oss-20b-warm.json`](../benchmarks/results/mac-m4pro-gpt-oss-20b-warm.json)
- [`mac-m4pro-qwen3-coder-30b-warm.json`](../benchmarks/results/mac-m4pro-qwen3-coder-30b-warm.json)

## Honest interpretation

- The deterministic policy is safe on this fixture set but fails to recognize two legitimate paraphrases. That is expected: it is a cheap safety/index layer, not sufficient semantic routing.
- `gpt-oss:20b` was conservative but not useful with the current routing prompt: it escalated every case, including all intended hits.
- `qwen3-coder:30b` perfectly classified this **small synthetic set** and was materially faster after warm-up on this machine. This is promising, not proof of general reliability.
- None of these results establish premium token savings. To claim savings, a future benchmark must run real agent sessions and measure upstream token/cost avoidance against a baseline.
- No deployed Workers AI benchmark is recorded yet. It should be measured only after a reviewed deployment exists and must be reported separately from local inference.

## Reproduce

Requirements:

```bash
bun install
ollama list
```

The recorded local models were already present on the measurement machine. Run the deterministic layer only:

```bash
bun run bench
```

Run one local Ollama model with a warm-up request and persist raw results:

```bash
bun run bench:ollama -- --warmup --ollama-model qwen3-coder:30b \
  --output benchmarks/results/my-qwen3-coder-30b.json
```

Run another model:

```bash
bun run bench:ollama -- --warmup --ollama-model gpt-oss:20b \
  --output benchmarks/results/my-gpt-oss-20b.json
```

## Benchmark rules

- Add cases before tuning prompts or matching thresholds when investigating failure modes.
- Commit raw outputs with machine/model context; do not copy only flattering summary numbers.
- Never describe model weights as employer-approved based on this benchmark. Confirm tool, license, and data-policy status independently.
- Use public or synthetic prompts only in the committed benchmark corpus.
