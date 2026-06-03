import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Box, Text } from "@earendil-works/pi-tui";
import { executePublicRecipe, type RecipeExecution } from "../../src/public-recipes";

type CacheLayerMessage = {
  recipeId: string;
  durationMs: number;
  evidence: string[];
};

export default function (pi: ExtensionAPI) {
  pi.registerMessageRenderer<CacheLayerMessage>("cache-layer-hit", (message, { expanded }, theme) => {
    const details = message.details;
    const box = new Box(1, 1, (text) => theme.bg("customMessageBg", text));
    let content = `${theme.fg("success", "RECIPE HIT")} ${message.content}`;
    if (details) {
      content += `\n${theme.fg("dim", `${details.recipeId} · ${details.durationMs.toFixed(1)} ms · no frontier turn`)}`;
      if (expanded) content += `\n${details.evidence.map((item) => theme.fg("muted", `  ✓ ${item}`)).join("\n")}`;
    }
    box.addChild(new Text(content, 0, 0));
    return box;
  });

  pi.registerCommand("cache-status", {
    description: "Show cache-layer pi experiment scope",
    handler: async (_args, ctx) => {
      ctx.ui.notify("cache-layer: executable recipe = git-status-summary; public/read-only evaluation only", "info");
    }
  });

  pi.on("input", async (event, ctx) => {
    if (event.source === "extension" || event.streamingBehavior) return { action: "continue" };
    const decision = await executePublicRecipe(event.text, ctx.cwd);
    if (!decision.handled || !decision.execution) return { action: "continue" };
    const execution: RecipeExecution = decision.execution;
    pi.sendMessage<CacheLayerMessage>({
      customType: "cache-layer-hit",
      content: execution.answer,
      display: true,
      details: {
        recipeId: execution.recipe.id,
        durationMs: execution.durationMs,
        evidence: execution.evidence
      }
    });
    if (!ctx.hasUI) console.log(`[cache-layer] RECIPE HIT · ${execution.recipe.id} · no frontier turn\n${execution.answer}`);
    pi.appendEntry("cache-layer-route", {
      prompt: event.text,
      route: "recipe_hit",
      recipeId: execution.recipe.id,
      durationMs: execution.durationMs,
      timestamp: Date.now()
    });
    return { action: "handled" };
  });
}
