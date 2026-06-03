const base = process.env.BASE_URL ?? "http://127.0.0.1:8791";

async function get(path: string) {
  const response = await fetch(`${base}${path}`);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
}

const health = await get("/health");
if (health.ok !== true || health.mode !== "public-data-only") throw new Error("Unexpected health response");

for (const page of ["/", "/safe.html", "/escalate.html", "/sensitive.html"]) {
  const response = await fetch(`${base}${page}`);
  if (!response.ok || !(await response.text()).includes("cache-layer")) throw new Error(`${page}: UI unavailable`);
}

console.log("smoke ok · proof pages and health endpoint");
