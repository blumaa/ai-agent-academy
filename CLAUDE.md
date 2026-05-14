@.claude/academy.md

# AAAnalytics — AI Agent Academy

MCP server providing quality gate evaluation for AI coding agents. Six rubrics covering bugs/correctness, performance, security, UX/accessibility, design systems, and DRY/SOLID/SSOT/KISS.

Enable/disable via `/mcp` in Claude Code. When enabled, the agent self-evaluates against a rubric before completing tasks.

## Principles

- TDD: write tests first, then implement
- KISS: simplest solution that works
- SOLID: single responsibility, open/closed, etc.
- DRY: single source of truth

## Tech Stack

- TypeScript (pure Node.js, no framework)
- MCP SDK (`@modelcontextprotocol/sdk`)
- Zod (input validation)
- Vitest (testing)

## Project Structure

```
src/
  mcp/server.ts        # MCP server — 6 tools
  lib/rubrics.ts       # 6 rubric definitions (static data)
  lib/evaluator.ts     # Score validation, pass/fail logic
  lib/formatter.ts     # Terminal bar chart renderer
  lib/lessons.ts       # Lesson storage and compilation
data/lessons/           # Per-project lesson files (gitignored)
```

## Commands

- `npm test` — run all tests
- `npm run mcp` — start MCP server (stdio)
- `npm run typecheck` — TypeScript check

## MCP Tools

- `health_check` — verify server is running
- `list_rubrics` — summary of all 6 rubrics
- `get_rubric` — full rubric with criteria and level descriptions
- `run_specs` — evaluate scores, format scorecard, pass/fail verdict
- `save_lesson` — persist what the agent learned (user-approved)
- `get_lessons` — retrieve compiled lessons from past evaluations

## Cross-Project Setup

Register in any project's `.claude/settings.local.json`:
```json
{
  "mcpServers": {
    "ai-agent-academy": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "cwd": "/path/to/AAAnalytics"
    }
  }
}
```
Add `@/path/to/AAAnalytics/.claude/academy.md` to that project's CLAUDE.md.
