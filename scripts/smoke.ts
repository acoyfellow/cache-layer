const base = process.env.BASE_URL ?? "http://127.0.0.1:8791";

async function get(path: string) {
  const response = await fetch(`${base}${path}`);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
}

async function route(prompt: string) {
  const response = await fetch(`${base}/api/route`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt })
  });
  if (!response.ok) throw new Error(`/api/route: HTTP ${response.status}`);
  return response.json() as Promise<{ route: string; recipe?: { id: string } }>;
}

const health = await get("/health");
if (health.ok !== true || health.mode !== "public-data-only") throw new Error("Unexpected health response");

for (const page of ["/", "/safe.html", "/escalate.html", "/sensitive.html"]) {
  const response = await fetch(`${base}${page}`);
  if (!response.ok || !(await response.text()).includes("cache-layer")) throw new Error(`${page}: UI unavailable`);
}

const safe = await route("summarize my git status");
if (safe.route !== "recipe_hit" || safe.recipe?.id !== "git-status-summary") throw new Error("Safe route did not hit recipe");

const novel = await route("refactor the authentication architecture");
if (novel.route !== "escalate") throw new Error("Novel write-heavy task did not escalate");

const sensitive = await route("inspect a customer token from our private repo");
if (sensitive.route !== "escalate") throw new Error("Sensitive request did not escalate");

console.log("smoke ok · UI pages, health, recipe hit, novel escalation, sensitive escalation");
