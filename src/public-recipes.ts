import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Recipe } from "./recipes";
import { AuthenticationRouter, type Decision } from "./router";

const execFileAsync = promisify(execFile);

export type RecipeExecution = {
  recipe: Recipe;
  answer: string;
  evidence: string[];
  durationMs: number;
};

export type LocalHandleDecision = {
  handled: boolean;
  reason: string;
  execution?: RecipeExecution;
};

export interface RecipeExecutor {
  execute(recipe: Recipe, cwd: string): Promise<Omit<RecipeExecution, "recipe"> | undefined>;
}

async function runGit(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd, timeout: 10_000, maxBuffer: 512 * 1024 });
  return stdout.trimEnd();
}

export function summarizeGitStatus(status: string): string {
  const lines = status.split("\n").filter(Boolean);
  const branch = lines.shift()?.replace(/^##\s*/, "") ?? "unknown branch";
  const fileLines = lines.filter((line) => line.length >= 3);
  if (fileLines.length === 0) return `Repository is clean on ${branch}.`;
  const staged = fileLines.filter((line) => line[0] !== " " && line[0] !== "?").length;
  const modified = fileLines.filter((line) => line[1] !== " " && line[1] !== "?").length;
  const untracked = fileLines.filter((line) => line.startsWith("??")).length;
  const parts = [
    `${fileLines.length} changed file${fileLines.length === 1 ? "" : "s"}`,
    `${staged} staged`,
    `${modified} modified`,
    `${untracked} untracked`
  ];
  return `On ${branch}: ${parts.join(", ")}.`;
}

export class GitStatusExecutor implements RecipeExecutor {
  async execute(recipe: Recipe, cwd: string): Promise<Omit<RecipeExecution, "recipe"> | undefined> {
    if (recipe.id !== "git-status-summary") return undefined;
    const started = performance.now();
    await runGit(cwd, ["rev-parse", "--is-inside-work-tree"]);
    const status = await runGit(cwd, ["status", "--short", "--branch"]);
    return {
      answer: summarizeGitStatus(status),
      evidence: ["git status --short --branch", "read-only command", "frontier model was not invoked"],
      durationMs: performance.now() - started
    };
  }
}

export class AuthorizedRecipeService {
  constructor(
    private readonly router: Pick<AuthenticationRouter, "authorize"> = new AuthenticationRouter(),
    private readonly executors: RecipeExecutor[] = [new GitStatusExecutor()]
  ) {}

  async handle(prompt: string, cwd: string): Promise<LocalHandleDecision> {
    const decision: Decision = this.router.authorize(prompt);
    if (decision.route !== "recipe_hit" || !decision.recipe) {
      return { handled: false, reason: decision.reason };
    }
    try {
      for (const executor of this.executors) {
        const execution = await executor.execute(decision.recipe, cwd);
        if (execution) {
          return { handled: true, reason: decision.reason, execution: { recipe: decision.recipe, ...execution } };
        }
      }
      return { handled: false, reason: "Matched recipe is documented but not executable in the pi experiment yet." };
    } catch (error) {
      return { handled: false, reason: `Recipe execution failed and must escalate: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
}

const publicRecipeService = new AuthorizedRecipeService();

export async function executePublicRecipe(prompt: string, cwd: string): Promise<LocalHandleDecision> {
  return publicRecipeService.handle(prompt, cwd);
}
