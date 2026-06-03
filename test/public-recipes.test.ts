import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";
import { AuthorizedRecipeService, executePublicRecipe, summarizeGitStatus } from "../src/public-recipes";
import { recipes } from "../src/recipes";

describe("summarizeGitStatus", () => {
  test("summarizes status counts", () => {
    const result = summarizeGitStatus("## main\n M README.md\nA  staged.txt\n?? note.txt");
    expect(result).toContain("3 changed files");
    expect(result).toContain("1 staged");
    expect(result).toContain("1 modified");
    expect(result).toContain("1 untracked");
  });
});

describe("executePublicRecipe", () => {
  test("executes a real read-only git-status recipe and does not modify files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cache-layer-recipe-"));
    try {
      await $`git -C ${dir} init -b main`.quiet();
      await Bun.write(join(dir, "tracked.txt"), "initial\n");
      await $`git -C ${dir} add tracked.txt && git -C ${dir} -c user.name=Test -c user.email=test@example.com commit -m init`.quiet();
      await Bun.write(join(dir, "tracked.txt"), "changed\n");
      await Bun.write(join(dir, "untracked.txt"), "new\n");
      const before = await $`git -C ${dir} status --porcelain`.text();
      const result = await executePublicRecipe("summarize my git status", dir);
      const after = await $`git -C ${dir} status --porcelain`.text();
      expect(result.handled).toBe(true);
      expect(result.execution?.recipe.id).toBe("git-status-summary");
      expect(result.execution?.answer).toContain("2 changed files");
      expect(after).toBe(before);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("does not execute a risky request", async () => {
    const result = await executePublicRecipe("refactor the authentication architecture", process.cwd());
    expect(result.handled).toBe(false);
  });

  test("executes only a recipe authorized by the injected router", async () => {
    let executed = false;
    const service = new AuthorizedRecipeService({
      authorize() {
        return {
          route: "recipe_hit",
          recipe: recipes[0],
          confidence: 1,
          reason: "Authorized in test.",
          flags: [],
          engine: "deterministic"
        };
      }
    }, [{
      async execute() {
        executed = true;
        return { answer: "safe", evidence: [], durationMs: 0 };
      }
    }]);
    const result = await service.handle("ignored", process.cwd());
    expect(executed).toBe(true);
    expect(result.execution?.answer).toBe("safe");
  });
});
