import { describe, expect, test } from "bun:test";
import { deterministicRoute, routePrompt } from "../src/router";

describe("deterministicRoute", () => {
  test("hits an approved read-only recipe", () => {
    const decision = deterministicRoute("summarize my git status");
    expect(decision.route).toBe("recipe_hit");
    expect(decision.recipe?.id).toBe("git-status-summary");
    expect(decision.recipe?.risk).toBe("read_only");
  });

  test("escalates a write-heavy judgment request", () => {
    const decision = deterministicRoute("refactor the authentication architecture");
    expect(decision.route).toBe("escalate");
    expect(decision.reason).toContain("outside the read-only cache boundary");
  });

  test("escalates sensitive context", () => {
    const decision = deterministicRoute("inspect a customer token from our private repo");
    expect(decision.route).toBe("escalate");
    expect(decision.reason).toContain("Sensitive");
  });

  test("escalates an unmatched task", () => {
    expect(deterministicRoute("tell me something interesting").route).toBe("escalate");
  });
});

describe("routePrompt", () => {
  test("uses Workers AI to confirm safe deterministic hits", async () => {
    const decision = await routePrompt("summarize my git status", {
      async run() { return { response: "KEEP" }; }
    });
    expect(decision.route).toBe("recipe_hit");
    expect(decision.engine).toBe("workers-ai");
  });

  test("Workers AI can veto a candidate hit", async () => {
    const decision = await routePrompt("summarize my git status", {
      async run() { return { response: "ESCALATE" }; }
    });
    expect(decision.route).toBe("escalate");
    expect(decision.engine).toBe("workers-ai");
  });

  test("risky requests never reach the model confirmation step", async () => {
    let called = false;
    const decision = await routePrompt("deploy this app", {
      async run() { called = true; return { response: "KEEP" }; }
    });
    expect(decision.route).toBe("escalate");
    expect(called).toBe(false);
  });
});
