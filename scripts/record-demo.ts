import { openLocalBrowser } from "unsurf/skills/record";
import { mkdir } from "node:fs/promises";

const base = process.env.BASE_URL ?? "http://127.0.0.1:8791";
const out = process.env.VIDEO_OUT ?? "./recordings/cache-layer-local-proof.webm";

await mkdir("./recordings", { recursive: true });
const browser = await openLocalBrowser();
let recording = false;
try {
  await browser.goto(base);
  await browser.wait({ selector: "#route", timeoutMs: 10_000 });
  await browser.startRecording(out);
  recording = true;
  await browser.wait(900);

  await browser.goto(`${base}/safe.html`);
  await browser.wait({ selector: ".badge.hit", timeoutMs: 10_000 });
  await browser.wait(1400);

  await browser.goto(`${base}/escalate.html`);
  await browser.wait({ selector: ".badge.escalate", timeoutMs: 10_000 });
  await browser.wait(1500);

  await browser.goto(`${base}/sensitive.html`);
  await browser.wait({ selector: ".badge.escalate", timeoutMs: 10_000 });
  await browser.wait(1700);
} finally {
  if (recording) await browser.stopRecording();
  await browser.close();
}

console.log(`wrote ${out}`);
