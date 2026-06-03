import { createAgentSession, DefaultResourceLoader, getAgentDir, SessionManager } from "@earendil-works/pi-coding-agent";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { performance } from "node:perf_hooks";

type Fixture = { id: string; prompt: string; shouldHandleLocally: boolean };
type Run = { id: string; prompt: string; localHit: boolean; latencyMs: number; frontierMessages: number };

const args = process.argv.slice(2);
const outputIndex = args.indexOf("--output");
const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : "benchmarks/results/pi-extension-public-repo.json";
const cwd = process.cwd();
const fixtures = JSON.parse(await readFile(join(cwd, "benchmarks", "pi-cases.json"), "utf8")) as Fixture[];
const localOnly = fixtures.filter((item) => item.shouldHandleLocally);
const deferred = fixtures.filter((item) => !item.shouldHandleLocally);
const repetitions = Math.max(1, Number.parseInt(args[args.indexOf("--runs") + 1] ?? "1", 10));
const resourceLoader = new DefaultResourceLoader({
  cwd,
  agentDir: getAgentDir(),
  additionalExtensionPaths: [join(cwd, "extensions", "cache-layer", "index.ts")]
});
await resourceLoader.reload();

const runs: Run[] = [];
for (let run = 0; run < repetitions; run += 1) {
  for (const fixture of localOnly) {
    const { session } = await createAgentSession({
      cwd,
      resourceLoader,
      sessionManager: SessionManager.inMemory(cwd)
    });
    const started = performance.now();
    try {
      await session.prompt(fixture.prompt);
      const messages = session.messages;
      const custom = messages.find((message) => message.role === "custom" && message.customType === "cache-layer-hit");
      const assistantMessages = messages.filter((message) => message.role === "assistant").length;
      runs.push({
        id: `${fixture.id}-run-${run + 1}`,
        prompt: fixture.prompt,
        localHit: Boolean(custom),
        latencyMs: performance.now() - started,
        frontierMessages: assistantMessages
      });
    } finally {
      session.dispose();
    }
  }
}
const passed = runs.filter((run) => run.localHit && run.frontierMessages === 0).length;
const latencies = runs.map((run) => run.latencyMs).sort((a, b) => a - b);
const medianLatencyMs = latencies[Math.ceil(latencies.length / 2) - 1] ?? 0;
const output = {
  generatedAt: new Date().toISOString(),
  benchmark: "pi-extension-real-public-repo-local-hits-v1",
  repository: basename(cwd),
  claim: "An executable local recipe handled the approved git-status prompt in a real pi AgentSession without producing an assistant/frontier-model message.",
  scope: "Expected-escalation prompts are listed but deliberately not executed in this proof because they would invoke the user's configured upstream model and require a controlled paid/token baseline.",
  deferredEscalationPrompts: deferred,
  results: {
    promptsAttempted: runs.length,
    completedLocallyWithoutFrontierMessage: passed,
    localCompletionRate: passed / Math.max(1, runs.length),
    medianLatencyMs
  },
  runs
};
await mkdir(join(cwd, "benchmarks", "results"), { recursive: true });
await writeFile(join(cwd, outputPath), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
if (passed !== runs.length) process.exitCode = 1;
