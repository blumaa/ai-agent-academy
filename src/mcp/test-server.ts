import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "src/mcp/server.ts"],
    env: {
      ...process.env,
      DATABASE_URL: "postgresql://localhost:5432/aaanalytics",
    },
  });

  const client = new Client({ name: "test-client", version: "1.0" });
  await client.connect(transport);

  // List tools
  const tools = await client.listTools();
  console.log(
    "Tools:",
    tools.tools.map((t) => t.name),
  );

  // Test get_rubric (compact)
  const rubric = await client.callTool({
    name: "get_rubric",
    arguments: {},
  });
  const rubricData = JSON.parse(
    (rubric.content as Array<{ type: string; text: string }>)[0].text,
  );
  console.log("\nget_rubric (compact):");
  console.log("  Title:", rubricData.title);
  console.log("  Criteria:", rubricData.criteria.length);
  console.log("  Levels:", rubricData.levels.length);
  console.log(
    "  Token estimate:",
    JSON.stringify(rubricData).length,
    "chars",
  );

  // Test get_rubric (with descriptions)
  const rubricFull = await client.callTool({
    name: "get_rubric",
    arguments: { include_descriptions: true },
  });
  const rubricFullData = JSON.parse(
    (rubricFull.content as Array<{ type: string; text: string }>)[0].text,
  );
  console.log("\nget_rubric (with descriptions):");
  console.log(
    "  Token estimate:",
    JSON.stringify(rubricFullData).length,
    "chars",
  );

  // Test submit_self_score
  const submitResult = await client.callTool({
    name: "submit_self_score",
    arguments: {
      rubric_id: rubricData.rubric_id,
      scores: rubricData.criteria.map(
        (c: { id: string; name: string }, i: number) => ({
          criterion_id: c.id,
          level_id: rubricData.levels[Math.min(i + 2, 4)].id,
          comment: `Self-assessed ${c.name} based on implementation quality`,
          citations: [{ file: "src/app/page.tsx", line: 1, note: "main page" }],
        }),
      ),
      agent_tokens: 15000,
    },
  });
  const submitData = JSON.parse(
    (submitResult.content as Array<{ type: string; text: string }>)[0].text,
  );
  console.log("\nsubmit_self_score:");
  console.log("  Run ID:", submitData.run_id);
  console.log("  Status:", submitData.status);
  console.log("  View URL:", submitData.view_url);

  // Test get_feedback
  const feedback = await client.callTool({
    name: "get_feedback",
    arguments: { run_id: submitData.run_id },
  });
  const feedbackData = JSON.parse(
    (feedback.content as Array<{ type: string; text: string }>)[0].text,
  );
  console.log("\nget_feedback:");
  console.log("  Status:", feedbackData.status);
  console.log("  Criteria scored:", feedbackData.feedback.length);
  feedbackData.feedback.forEach(
    (f: { criterion: string; your_score: number }) => {
      console.log(`    ${f.criterion}: self-score ${f.your_score}`);
    },
  );

  console.log("\nAll MCP tools working.");
  await client.close();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
