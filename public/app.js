const prompt = document.querySelector("#prompt");
const routeButton = document.querySelector("#route");
const badge = document.querySelector("#badge");
const title = document.querySelector("#title");
const reason = document.querySelector("#reason");
const evidence = document.querySelector("#evidence");
const proofStep = document.querySelector("#proof-step");
let proofTimer;

for (const button of document.querySelectorAll("[data-prompt]")) {
  button.addEventListener("click", () => {
    prompt.value = button.dataset.prompt;
    prompt.focus();
  });
}

function showLoading() {
  clearInterval(proofTimer);
  routeButton.disabled = true;
  badge.className = "badge waiting";
  badge.textContent = "ROUTING";
  title.textContent = "Checking approved recipes…";
  reason.textContent = "Applying the public-data and read-only policy boundary.";
  evidence.innerHTML = "";
  evidence.className = "evidence";
  const steps = ["policy gate · scanning risk boundary", "recipe index · selecting candidates", "verification · preparing decision"];
  let index = 0;
  proofStep.textContent = steps[index];
  proofTimer = setInterval(() => { index = Math.min(index + 1, steps.length - 1); proofStep.textContent = steps[index]; }, 170);
}

function evidenceRow(text) {
  const row = document.createElement("div");
  row.textContent = text;
  return row;
}

function render(data) {
  clearInterval(proofTimer);
  const isHit = data.route === "recipe_hit";
  proofStep.textContent = isHit ? "route complete · approved read-only path" : "route complete · escalation boundary enforced";
  badge.className = `badge ${isHit ? "hit" : "escalate"}`;
  badge.textContent = isHit ? "RECIPE HIT" : "ESCALATE";
  title.textContent = isHit ? data.recipe.title : "Send this upstream.";
  reason.textContent = data.reason;
  evidence.className = `evidence ${isHit ? "" : "escalated"}`;
  evidence.innerHTML = "";
  if (isHit) {
    evidence.append(evidenceRow(`recipe · ${data.recipe.id}`));
    evidence.append(evidenceRow(`risk · ${data.recipe.risk}`));
    for (const item of data.recipe.proof) evidence.append(evidenceRow(item));
  } else {
    evidence.append(evidenceRow("No local execution performed"));
    evidence.append(evidenceRow("Frontier-model handoff recommended"));
    evidence.append(evidenceRow(data.policy.boundary));
  }
}

async function run() {
  showLoading();
  try {
    const response = await fetch("/api/route", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: prompt.value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Could not route task.");
    render(data);
  } catch (error) {
    clearInterval(proofTimer);
    proofStep.textContent = "route failed";
    badge.className = "badge escalate";
    badge.textContent = "ERROR";
    title.textContent = "Router unavailable.";
    reason.textContent = error instanceof Error ? error.message : "Could not reach the router.";
    evidence.innerHTML = "";
  } finally {
    routeButton.disabled = false;
  }
}

routeButton.addEventListener("click", run);
prompt.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") run();
});

