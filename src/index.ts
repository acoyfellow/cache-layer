interface Env {
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
    return env.ASSETS.fetch(request);
  }
} satisfies ExportedHandler<Env>;
