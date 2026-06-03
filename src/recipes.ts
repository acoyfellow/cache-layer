export type Risk = "read_only" | "writes_files" | "external_write" | "sensitive";

export type Recipe = {
  id: string;
  title: string;
  description: string;
  risk: Risk;
  handles: string[];
  proof: string[];
  boundary: string;
};

export const recipes: Recipe[] = [
  {
    id: "git-status-summary",
    title: "Summarize repository status",
    description: "Read git status and explain changed, staged, and untracked files.",
    risk: "read_only",
    handles: ["summarize my git status", "what changed locally", "do i have uncommitted files", "show changed files"],
    proof: ["Runs read-only `git status --short --branch`", "No files modified", "No remote calls required"],
    boundary: "In an agent integration this recipe may inspect the current public repository only."
  },
  {
    id: "test-failure-summary",
    title: "Summarize a known test failure",
    description: "Condense already-provided test output into failures and next inspection steps.",
    risk: "read_only",
    handles: ["summarize this test failure", "what test failed", "explain this public ci output", "summarize failing tests"],
    proof: ["Reads provided public or dummy output only", "Preserves the source artifact", "No edit or deploy action"],
    boundary: "Input must not contain confidential source, secrets, customer data, or personal data."
  },
  {
    id: "public-docs-lookup",
    title: "Find public product documentation",
    description: "Route a documentation lookup over public material to a bounded search workflow.",
    risk: "read_only",
    handles: ["find public docs", "look up workers documentation", "find cloudflare developer documentation", "search public docs"],
    proof: ["Public documentation only", "Read-only retrieval", "Source links retained"],
    boundary: "Does not query internal documentation or access-controlled systems."
  }
];
