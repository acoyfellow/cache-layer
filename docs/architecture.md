# Architecture

## Request path

`cache-layer` exposes a static proof site and a health endpoint. The executable experiment runs through the pi extension locally. Authentication/authorization is split into explicit layers instead of mixing policy, matching, and model confirmation in one function:

1. `PublicReadOnlyPolicy` is the authorization boundary. It rejects sensitive, write-capable, destructive, or judgment-heavy requests and records categorized policy flags.
2. `ExampleRecipeMatcher` selects a candidate workflow from the public recipe registry; matching never grants permission by itself.
3. `AuthenticationRouter` asks the policy to authorize the selected candidate and emits the stable route decision used by the pi integration and benchmark harness.
4. `WorkersAICandidateVerifier`, retained for the next hosted experiment, may veto an already-authorized read-only match but cannot promote a denied request.
5. `AuthorizedRecipeService` dispatches locally executable recipes only after authorization has succeeded.

All boundaries are injectable interfaces, so additional policy implementations, candidate matchers, verifiers, or executors can be tested independently without weakening the default public/read-only posture.

## Why Workers AI is behind a deterministic gate

The safety boundary must not depend on an LLM claiming a request is safe. The model only confirms candidate read-only hits already allowed by deterministic policy. Likewise, recipe execution consumes an authorized decision rather than reimplementing safety checks.

## Why no D1 yet

The initial proof does not need persistence: recipes ship in source and the deployed site accepts no prompts. Add D1 only when user-managed recipes or meaningful route metrics are part of the product.
