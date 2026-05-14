# AI Agent Academy

Quality gate for AI coding agents. Agents evaluate their own work against rubrics, learn from their scores, and stop repeating the same mistakes.

## How it works

1. Agent receives a task
2. Agent does the work (TDD-style)
3. Agent self-evaluates against a rubric (bugs, performance, security, UX, design systems, or DRY/SOLID/KISS)
4. Quality gate passes or fails based on scores
5. Agent reflects on what it learned and asks to save the lesson
6. Next task, the agent loads past lessons and applies them

## Install

Requires Node.js 20+.

```bash
git clone https://github.com/blumaa/ai-agent-academy.git
cd ai-agent-academy
npm install
```

### Register as an MCP server

Add to your project's `.claude/settings.local.json`:

```json
{
  "mcpServers": {
    "ai-agent-academy": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "cwd": "/path/to/ai-agent-academy"
    }
  }
}
```

Add this line to your project's `CLAUDE.md`:

```
@/path/to/ai-agent-academy/.claude/academy.md
```

That loads the quality gate protocol. The agent follows it automatically.

## MCP Tools

| Tool | Purpose |
|------|---------|
| `health_check` | Verify the server is running |
| `list_rubrics` | List all 6 rubrics |
| `get_rubric` | Load rubric criteria and scoring levels |
| `run_specs` | Submit scores, get scorecard, pass/fail verdict |
| `save_lesson` | Save what the agent learned (user-approved) |
| `get_lessons` | Load past lessons at the start of a task |

## Rubrics

Six rubrics, each with 4-5 criteria scored 1-5:

- **Bugs & Correctness** — error handling, state management, edge cases, type safety
- **Performance** — bundle size, rendering, data fetching, Core Web Vitals
- **Security** — input sanitization, auth, dependencies, secrets
- **UX & Accessibility** — keyboard nav, semantic HTML, a11y, loading/error states
- **Design System** — atomic design, tokens, component reuse, spacing, typography
- **DRY, SOLID, SSOT, KISS** — code duplication, single responsibility, source of truth, simplicity

PDF versions of all rubrics are available for free at [code-consultant-blumaa.vercel.app](https://code-consultant-blumaa.vercel.app/).

## Commands

```bash
npm test        # run tests
npm run mcp     # start MCP server
npm run typecheck  # TypeScript check
```

## License

MIT
