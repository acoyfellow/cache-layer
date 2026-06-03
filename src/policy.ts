import type { Recipe } from "./recipes";

export type PolicyFlagCategory = "sensitive" | "write" | "judgment";

export type PolicyFlag = {
  category: PolicyFlagCategory;
  term: string;
};

export type Authorization = {
  allowed: boolean;
  confidence: number;
  reason: string;
  flags: PolicyFlag[];
};

export interface RecipeAuthorizationPolicy {
  authorize(prompt: string, recipe?: Recipe): Authorization;
}

export const escalationReasons = {
  missingPrompt: "No request provided.",
  sensitive: "Sensitive or access-controlled context requires a reviewed upstream path.",
  unsafe: "Novel, write-capable, or judgment-heavy work is outside the read-only cache boundary.",
  unsupported: "No approved read-only recipe matched with sufficient confidence."
} as const;

const writeTerms = [
  "write", "edit", "fix", "implement", "refactor", "change", "create", "delete", "remove", "commit", "push", "deploy", "merge", "post", "send"
];
const sensitiveTerms = [
  "secret", "token", "customer", "personal", "pii", "production data", "internal wiki", "private repo", "confidential", "restricted"
];
const architectureTerms = ["architecture", "design", "strategy", "security review", "vulnerability", "auth system"];

export const normalizePrompt = (input: string) => input.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();

function matchedFlags(text: string, category: PolicyFlagCategory, terms: string[]): PolicyFlag[] {
  return terms.filter((term) => text.includes(term)).map((term) => ({ category, term }));
}

export class PublicReadOnlyPolicy implements RecipeAuthorizationPolicy {
  authorize(prompt: string, recipe?: Recipe): Authorization {
    const normalized = normalizePrompt(prompt);
    if (!normalized) {
      return { allowed: false, confidence: 1, reason: escalationReasons.missingPrompt, flags: [] };
    }

    const sensitive = matchedFlags(normalized, "sensitive", sensitiveTerms);
    if (sensitive.length) {
      return { allowed: false, confidence: 1, reason: escalationReasons.sensitive, flags: sensitive };
    }

    const unsafe = [
      ...matchedFlags(normalized, "write", writeTerms),
      ...matchedFlags(normalized, "judgment", architectureTerms)
    ];
    if (unsafe.length) {
      return { allowed: false, confidence: 0.99, reason: escalationReasons.unsafe, flags: unsafe };
    }

    if (!recipe || recipe.risk !== "read_only") {
      return { allowed: false, confidence: 0.91, reason: escalationReasons.unsupported, flags: [] };
    }

    return {
      allowed: true,
      confidence: 1,
      reason: "Matched an approved read-only recipe with inspectable evidence.",
      flags: []
    };
  }
}
