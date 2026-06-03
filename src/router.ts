import { PublicReadOnlyPolicy, normalizePrompt, type PolicyFlag, type RecipeAuthorizationPolicy } from "./policy";
import { recipes, type Recipe, type Risk } from "./recipes";

export type Decision = {
  route: "recipe_hit" | "escalate";
  recipe?: Recipe;
  confidence: number;
  reason: string;
  flags: string[];
  policyFlags?: PolicyFlag[];
  engine: "deterministic" | "workers-ai";
};

export interface RecipeMatcher {
  match(prompt: string): { recipe?: Recipe; confidence: number };
}

export interface CandidateVerifier {
  verify(prompt: string, recipe: Recipe): Promise<boolean>;
}

function score(query: string, example: string): number {
  const input = normalizePrompt(query);
  const candidate = normalizePrompt(example);
  if (input === candidate) return 1;
  if (input.includes(candidate) || candidate.includes(input)) return 0.96;
  const inputWords = new Set(input.split(" ").filter(Boolean));
  const candidateWords = new Set(candidate.split(" ").filter(Boolean));
  let overlap = 0;
  for (const word of candidateWords) if (inputWords.has(word)) overlap += 1;
  return overlap / Math.max(candidateWords.size, inputWords.size, 1);
}

export class ExampleRecipeMatcher implements RecipeMatcher {
  constructor(private readonly availableRecipes: Recipe[] = recipes) {}

  match(prompt: string): { recipe?: Recipe; confidence: number } {
    let best: Recipe | undefined;
    let confidence = 0;
    for (const recipe of this.availableRecipes) {
      for (const example of recipe.handles) {
        const next = score(prompt, example);
        if (next > confidence) {
          best = recipe;
          confidence = next;
        }
      }
    }
    return { recipe: best, confidence };
  }
}

function toDecision(authorization: ReturnType<RecipeAuthorizationPolicy["authorize"]>, recipe?: Recipe): Decision {
  return {
    route: authorization.allowed ? "recipe_hit" : "escalate",
    recipe: authorization.allowed ? recipe : undefined,
    confidence: authorization.confidence,
    reason: authorization.reason,
    flags: authorization.flags.map((flag) => flag.term),
    policyFlags: authorization.flags,
    engine: "deterministic"
  };
}

export class AuthenticationRouter {
  constructor(
    private readonly policy: RecipeAuthorizationPolicy = new PublicReadOnlyPolicy(),
    private readonly matcher: RecipeMatcher = new ExampleRecipeMatcher(),
    private readonly verifier?: CandidateVerifier
  ) {}

  authorize(prompt: string): Decision {
    const policyGate = this.policy.authorize(prompt);
    if (!policyGate.allowed && policyGate.reason !== "No approved read-only recipe matched with sufficient confidence.") {
      return toDecision(policyGate);
    }

    const candidate = this.matcher.match(prompt);
    if (!candidate.recipe || candidate.confidence < 0.5) return toDecision(this.policy.authorize(prompt));

    const authorized = this.policy.authorize(prompt, candidate.recipe);
    const decision = toDecision(authorized, candidate.recipe);
    if (decision.route === "recipe_hit") decision.confidence = Math.round(candidate.confidence * 100) / 100;
    return decision;
  }

  async route(prompt: string): Promise<Decision> {
    const guarded = this.authorize(prompt);
    if (guarded.route === "escalate" || !guarded.recipe || !this.verifier) return guarded;
    try {
      if (!(await this.verifier.verify(prompt, guarded.recipe))) {
        return { route: "escalate", confidence: 0.95, reason: "Workers AI safety check did not confirm a safe recipe hit.", flags: [], policyFlags: [], engine: "workers-ai" };
      }
      return { ...guarded, engine: "workers-ai", reason: "Matched an approved read-only recipe; Workers AI confirmed the route." };
    } catch {
      return { ...guarded, reason: "Matched an approved read-only recipe. Workers AI was unavailable, so deterministic policy produced this demo route." };
    }
  }
}

type WorkersAI = { run(model: string, input: unknown): Promise<unknown> };
type AIAnswer = { response?: string };

export class WorkersAICandidateVerifier implements CandidateVerifier {
  constructor(private readonly ai: WorkersAI, private readonly availableRecipes: Recipe[] = recipes) {}

  async verify(prompt: string, recipe: Recipe): Promise<boolean> {
    const allowed = this.availableRecipes
      .filter((item) => item.risk === "read_only")
      .map((item) => ({ id: item.id, description: item.description }));
    const output = (await this.ai.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        {
          role: "system",
          content: "You are a conservative route checker. Return only KEEP or ESCALATE. KEEP only if the request exactly fits the candidate approved read-only recipe and contains no file write, external action, sensitive data, or novel judgment. Otherwise return ESCALATE."
        },
        {
          role: "user",
          content: JSON.stringify({ request: prompt, candidate: recipe.id, allowed })
        }
      ],
      max_tokens: 8
    })) as AIAnswer;
    return String(output?.response ?? "").toUpperCase().includes("KEEP");
  }
}

const deterministicRouter = new AuthenticationRouter();

export function deterministicRoute(prompt: string): Decision {
  return deterministicRouter.authorize(prompt);
}

export async function routePrompt(prompt: string, ai?: WorkersAI): Promise<Decision> {
  return ai
    ? new AuthenticationRouter(new PublicReadOnlyPolicy(), new ExampleRecipeMatcher(), new WorkersAICandidateVerifier(ai)).route(prompt)
    : deterministicRouter.route(prompt);
}

export function riskLabel(risk: Risk): string {
  return risk.replaceAll("_", "-");
}
