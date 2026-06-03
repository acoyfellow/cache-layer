import { recipes } from "./recipes";
import { riskLabel, routePrompt } from "./router";

interface Env {
  AI?: {
    run(model: string, input: unknown): Promise<unknown>;
  };
  ASSETS: Fetcher;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body, null, 2), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return json({ ok: true, service: "cache-layer", version: "0.0.1", mode: "public-data-only" });
    }
    if (url.pathname === "/api/recipes" && request.method === "GET") {
      return json({ recipes: recipes.map((recipe) => ({ ...recipe, risk: riskLabel(recipe.risk) })) });
    }
    if (url.pathname === "/api/route" && request.method === "POST") {
      let body: { prompt?: unknown };
      try {
        body = await request.json() as { prompt?: unknown };
      } catch {
        return json({ error: "Expected JSON body." }, 400);
      }
      const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, 4000) : "";
      if (!prompt.trim()) return json({ error: "Enter an agent task to route." }, 400);
      const decision = await routePrompt(prompt, env.AI);
      return json({
        request: prompt,
        ...decision,
        recipe: decision.recipe ? { ...decision.recipe, risk: riskLabel(decision.recipe.risk) } : undefined,
        policy: {
          boundary: "0.0.1 routes approved read-only public-data workflows only.",
          escalationIsSuccess: true,
          storesPrompt: false
        }
      });
    }
    if (url.pathname.startsWith("/api/")) return json({ error: "Not found." }, 404);
    return env.ASSETS.fetch(request);
  }
} satisfies ExportedHandler<Env>;
