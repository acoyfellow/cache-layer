import { recipes, type Recipe, type Risk } from "./recipes";

export type Decision = {
  route: "recipe_hit" | "escalate";
  recipe?: Recipe;
  confidence: number;
  reason: string;
  flags: string[];
  engine: "deterministic" | "workers-ai";
};

const writeTerms = [
  "write", "edit", "fix", "implement", "refactor", "change", "create", "delete", "remove", "commit", "push", "deploy", "merge", "post", "send"
];
const sensitiveTerms = [
  "secret", "token", "customer", "personal", "pii", "production data", "internal wiki", "private repo", "confidential", "restricted"
];
const architectureTerms = ["architecture", "design", "strategy", "security review", "vulnerability", "auth system"];

const clean = (input: string) => input.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();

function matchedTerms(text: string, terms: string[]): string[] {
  return terms.filter((term) => text.includes(term));
}

function score(query: string, example: string): number {
  const input = clean(query);
  const candidate = clean(example);
  if (input === candidate) return 1;
  if (input.includes(candidate) || candidate.includes(input)) return 0.96;
  const inputWords = new Set(input.split(" ").filter(Boolean));
  const candidateWords = new Set(candidate.split(" ").filter(Boolean));
  let overlap = 0;
  for (const word of candidateWords) if (inputWords.has(word)) overlap += 1;
  return overlap / Math.max(candidateWords.size, inputWords.size, 1);
}

function topRecipe(query: string): { recipe?: Recipe; confidence: number } {
  let best: Recipe | undefined;
  let confidence = 0;
  for (const recipe of recipes) {
    for (const example of recipe.handles) {
      const next = score(query, example);
      if (next > confidence) {
        best = recipe;
        confidence = next;
      }
    }
  }
  return { recipe: best, confidence };
}

export function deterministicRoute(prompt: string): Decision {
  const normalized = clean(prompt);
  if (!normalized) return { route: "escalate", confidence: 1, reason: "No request provided.", flags: [], engine: "deterministic" };

  const sensitive = matchedTerms(normalized, sensitiveTerms);
  if (sensitive.length) {
    return {
      route: "escalate",
      confidence: 1,
      reason: "Sensitive or access-controlled context requires a reviewed upstream path.",
      flags: sensitive,
      engine: "deterministic"
    };
  }

  const writes = matchedTerms(normalized, writeTerms);
  const judgment = matchedTerms(normalized, architectureTerms);
  if (writes.length || judgment.length) {
    return {
      route: "escalate",
      confidence: 0.99,
      reason: "Novel, write-capable, or judgment-heavy work is outside the read-only cache boundary.",
      flags: [...writes, ...judgment],
      engine: "deterministic"
    };
  }

  const candidate = topRecipe(normalized);
  if (candidate.recipe && candidate.recipe.risk === "read_only" && candidate.confidence >= 0.5) {
    return {
      route: "recipe_hit",
      recipe: candidate.recipe,
      confidence: Math.round(candidate.confidence * 100) / 100,
      reason: "Matched an approved read-only recipe with inspectable evidence.",
      flags: [],
      engine: "deterministic"
    };
  }

  return {
    route: "escalate",
    confidence: 0.91,
    reason: "No approved read-only recipe matched with sufficient confidence.",
    flags: [],
    engine: "deterministic"
  };
}

type WorkersAI = { run(model: string, input: unknown): Promise<unknown> };

type AIAnswer = { response?: string };

export async function routePrompt(prompt: string, ai?: WorkersAI): Promise<Decision> {
  const guarded = deterministicRoute(prompt);
  if (guarded.route === "escalate" || !ai) return guarded;

  const allowed = recipes.filter((recipe) => recipe.risk === "read_only").map((recipe) => ({ id: recipe.id, description: recipe.description }));
  try {
    const output = (await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        {
          role: "system",
          content: "You are a conservative route checker. Return only KEEP or ESCALATE. KEEP only if the request exactly fits the candidate approved read-only recipe and contains no file write, external action, sensitive data, or novel judgment. Otherwise return ESCALATE."
        },
        {
          role: "user",
          content: JSON.stringify({ request: prompt, candidate: guarded.recipe?.id, allowed })
        }
      ],
      max_tokens: 8
    })) as AIAnswer;
    const answer = String(output?.response ?? "").toUpperCase();
    if (!answer.includes("KEEP")) {
      return { route: "escalate", confidence: 0.95, reason: "Workers AI safety check did not confirm a safe recipe hit.", flags: [], engine: "workers-ai" };
    }
    return { ...guarded, engine: "workers-ai", reason: "Matched an approved read-only recipe; Workers AI confirmed the route." };
  } catch {
    return { ...guarded, reason: "Matched an approved read-only recipe. Workers AI was unavailable, so deterministic policy produced this demo route." };
  }
}

export function riskLabel(risk: Risk): string {
  return risk.replaceAll("_", "-");
}
