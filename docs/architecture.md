# Architecture

## Request path

`cache-layer` exposes a static UI and three Worker endpoints. The route endpoint evaluates a prompt in this order:

1. A deterministic policy gate rejects sensitive, write-capable, destructive, or judgment-heavy requests.
2. A small public recipe registry selects a candidate read-only workflow by examples.
3. When a Workers AI binding is available, Workers AI may veto the candidate match but cannot promote an unsafe request.
4. The UI renders either the approved recipe evidence or an escalation explanation.

## Why Workers AI is behind a deterministic gate

The safety boundary must not depend on an LLM claiming a request is safe. The model only confirms candidate read-only hits already allowed by deterministic policy.

## Why no D1 yet

The initial proof does not need persistence: recipes ship in source and prompts are not retained. Add D1 only when user-managed recipes or meaningful route metrics are part of the product.
