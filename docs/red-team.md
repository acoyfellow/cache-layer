# Red-team review before publication

## What this is

Before publishing `0.0.1`, the repository materials were evaluated through 20 reviewer lenses derived from the local `contributron` profile set. These are **simulated local-model critiques**, not endorsements, approvals, or opinions actually supplied by those colleagues.

The simulation used Ollama with `qwen3-coder:30b` over public repository material only.

Raw output is retained locally during review but is not intended as product evidence; the useful output is the set of issues it surfaced and which were resolved before publishing.

## Review result

Initial simulated verdicts:

| Verdict | Count |
|---|---:|
| Publish | 0 |
| Publish with changes | 17 |
| Do not publish / malformed response | 3 |

The repeated concern was accurate: the project could be mistaken for a hosted routing product or a proven token-saving system, while its implemented proof is narrower.

## Findings accepted and resolved

| Finding | Resolution before publication |
|---|---|
| Hosted prompt interaction looked like product theatre | Removed public prompt box and public routing endpoints; replaced with actual extension code and raw proof link. |
| Deployed site versus local extension was unclear | Deployed site is now described as a static proof site with `/health`; local pi extension is identified as the executable behavior. |
| Workers AI sounded shipped or required | Removed Workers AI from deployed bindings and current primitive table; described only as a possible future verifier experiment. |
| Token savings sounded implied without a baseline | README and benchmarks explicitly state there is no workload-level token-savings proof yet. |
| Safety boundary required proof | Published synthetic results include unsafe local-model false hits, supporting deterministic policy before semantic matching. |
| Need real execution evidence | Added a real pi `AgentSession` proof for one executable read-only recipe with zero frontier assistant messages. |
| Need negative/error tests | Tests cover risky denial, policy injection, Workers AI veto semantics, and real recipe non-mutation behavior. |

## Valid remaining limitations

These are not hidden; they define `0.0.1`:

- Only one executable pi recipe exists: `git-status-summary`.
- No representative baseline-versus-cache premium token measurement exists yet.
- No hosted semantic verifier is deployed.
- Synthetic routing cases are useful safety evidence, not proof of generalization.
- The local recipe experiment is intentionally restricted to public/dummy/read-only work.

## Publish decision

**Worth publishing as an honest exploration and reproducible proof, not as a finished token-saving product.**

The public claim is deliberately small:

> One real pi read-only recipe completed without a frontier-model turn, and local-model routing results show why deterministic policy must remain in front of semantic acceleration.

The next release earns broader claims only by adding additional executable recipes and controlled upstream-token baseline comparisons.
