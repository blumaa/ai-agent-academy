# AAA -- AI Agent Academy

**Evaluate AI coding agents against rubrics. Agents learn from their scores. Quality goes up, tokens go down.**

AAA is a local developer tool that evaluates AI coding agents against customizable rubrics, compares agent self-scores against human scores, and compiles the disagreements into per-agent memory -- so every evaluation makes your agent write better code with fewer tokens.

## Why AAA?

- **Dual scoring exposes blind spots.** Your agent scores itself, you score independently, then you compare. Disagreements reveal where the agent overestimates its own work -- the exact places bugs hide.

- **Agents remember what they got wrong.** After each evaluation, feedback is compiled into a per-agent memory file and injected into the next run. The agent does not repeat the same mistakes.

- **Measure quality AND cost on the same chart.** Most benchmarks measure pass/fail. AAA plots rubric score against token consumption, so you can prove your agent setup writes better code more efficiently over time.

- **Rubrics, not vibes.** Criteria are explicit, weighted, and customizable. You know exactly what "good" means before the agent writes a single line of code. A/AA/AAA ratings give you a shared vocabulary for agent quality.

- **Runs locally via MCP.** No cloud, no third-party eval services, no data leaving your machine. The agent calls `get_rubric`, builds the code, calls `submit_self_score`, and you review in the web UI.

## How It Works: The Calibration Loop

```
1. TASK        Agent receives a coding task + rubric criteria + lessons from past runs
                       |
2. BUILD       Agent writes the code
                       |
3. SELF-SCORE  Agent evaluates its own work against the rubric (with file:line citations)
                       |
4. HUMAN SCORE Human scores the same work independently via web UI
                       |
5. COMPARE     Where scores diverge beyond the delta threshold, a discussion happens
                       |
6. FINALIZE    Final scores are locked
                       |
7. COMPILE     Feedback from all runs is synthesized into per-agent memory
                       |
8. INJECT      Memory is injected into the agent's next run (back to step 1)
```

This creates two reinforcing feedback loops:

- **Agent calibration**: The agent learns where it overestimates its own work. Over runs, its self-assessment accuracy improves alongside its code quality.
- **Rubric calibration**: When human and agent scores disagree, the discussion often reveals that the rubric criteria need sharper definitions. The rubric itself gets better.

## Real Example

From an actual evaluation run in this repository:

**`staff-react-engineer` on "Code Consistency, DRY & SOLID" rubric**

The agent self-scored 3/4 on every criterion. The human scored 1/4 on every criterion. Average delta: 2.0.

Why? The agent claimed "consistent naming/formatting patterns" but shipped mixed CRA+Vite tooling that could not even `npm install`, barrel file anti-patterns, and the same union type copy-pasted into three files.

The coaching output produced 5 specific instructions added to agent memory:

```
- "Use Vite for all React projects. Never use react-scripts/CRA."
- "Extract shared TypeScript types to a types.ts file. Never duplicate union types."
- "Do not use barrel files (index.ts re-exports). Import directly from source files."
- "Components should receive callbacks via props, not import context hooks directly."
- "Always verify the project installs and runs before declaring completion."
```

This is the kind of gap that pass/fail benchmarks miss entirely.

## How AAA Is Different

Most AI evaluation tools answer one question: "Did the agent complete the task?"

AAA answers three:

1. **How well?** -- Rubric-based scoring with explicit criteria, not pass/fail. The same task can score 1/4 or 4/4 depending on code quality, architecture decisions, and adherence to project standards.

2. **Does the agent know how well?** -- Dual scoring reveals calibration gaps. An agent that thinks it scored 3/4 when the human scores 1/4 has a self-assessment problem that no benchmark will catch.

3. **Does it improve?** -- Per-agent memory compiles lessons from past evaluations and injects them into the next run. This is not prompt engineering by hand -- it is automated calibration from structured feedback.

Traditional eval tools measure capability at a point in time. AAA measures the trajectory.

## The Rating System

Agents earn ratings based on their final scores:

| Rating | Avg Score | Meaning |
|--------|-----------|---------|
| **A**  | 2.0 - 2.9 | Basic -- gets the job done with issues |
| **AA** | 3.0 - 3.9 | Good -- meets standards consistently |
| **AAA**| 4.0 - 5.0 | Excellent -- exceeds standards |

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL running locally on port 5432
- An Anthropic API key (see cost notice below)

### Setup

```bash
git clone <repo-url> AAAnalytics
cd AAAnalytics
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL and ANTHROPIC_API_KEY

# Set up the database
createdb aaanalytics
npm run db:migrate
npm run db:seed

# Start the dev server
npm run dev
```

### Running an Evaluation

1. **Define a rubric** in the web UI at `http://localhost:3000`. Set criteria, performance levels, and descriptions for each cell.
2. **Register an agent** with its agent file path (e.g., `~/.claude/agents/ui-engineer.md`).
3. **Create a test** with the task description the agent will receive.
4. **Run the evaluation** via the API or web UI. The agent builds the code, then self-scores using MCP tools.
5. **Score independently** in the web UI. Your scores are hidden from the agent's until both are submitted.
6. **Review disagreements.** Where scores diverge beyond the delta threshold, discuss and finalize.
7. **Memory compiles automatically.** After finalization, lessons are compiled into the agent's memory file for the next run.

### MCP Tools

AAA exposes four MCP tools that agents use during evaluation:

| Tool | Purpose |
|------|---------|
| `get_rubric` | Load rubric criteria and performance levels for self-grading |
| `submit_self_score` | Submit self-assessment with file:line citations as evidence |
| `get_feedback` | Retrieve finalized feedback showing score divergences |
| `get_memory` | Load compiled lessons from previous evaluations |

### CLI Slash Commands

```
/evaluate    Run an agent evaluation with dual scoring
/rubric      Create a rubric interactively
/task        Create a task description
/runs        View and compare past evaluations
```

### Cost Notice

AAA uses the Claude API for agent evaluation and memory compilation. Scoring and synthesis calls use `claude-sonnet-4-20250514`. At current pricing (~$3/M input, ~$15/M output tokens), a typical evaluation run costs $0.01-0.05. The agent under evaluation may consume significantly more tokens depending on the task. Monitor your usage at console.anthropic.com.

## Architecture

```
src/
  app/                    # Next.js App Router
    api/evaluate/         # Evaluation orchestration
    api/runs/[id]/        # Per-run scoring, discussion, finalization
    api/agents/[name]/    # Agent memory view and recompilation
  db/
    schema.ts             # Drizzle ORM schema
  lib/
    agent-memory/
      extractor.ts        # Extracts structured feedback from runs/*.json
      compiler.ts         # Synthesizes feedback into per-agent memory files
    graders/              # Automated, model, and human scoring
    scoring-engine.ts     # Score orchestration
    roi.ts                # Token ROI calculations
  mcp/
    server.ts             # MCP server (4 tools)
  components/             # React components (Tailwind CSS)

runs/                     # JSON output from completed evaluations
agent-memory/             # Compiled per-agent memory files (gitignored)
rubrics/                  # Rubric definitions
tasks/                    # Task descriptions
```

### Data Model

- **Rubrics** have versioned sets of **criteria** (rows) and **performance levels** (columns)
- **Rubric cells** define what each level looks like for each criterion
- **Evaluation runs** link an agent to a rubric version, tracking agent token cost and scoring token cost
- **Scores** capture three independent assessments per criterion: agent self-score, human score, and automated score
- **Score discussions** record the conversation when scores diverge

### Per-Agent Memory

After each finalized evaluation, the compiler reads all historical run data for that agent and synthesizes it into a structured memory file:

```
agent-memory/
  ui-engineer/
    memory.md             # Compiled lessons, injected into prompts
    history.jsonl          # Raw extraction log
  staff-react-engineer/
    memory.md
    history.jsonl
```

Memory is organized by: critical lessons (repeated failures), per-criterion score trends, and self-assessment calibration gaps. It is automatically injected into the agent's prompt at the start of the next evaluation.

## Why Rubrics?

AAA borrows from educational assessment research, where rubric-based evaluation and inter-rater reliability are the gold standard for measuring student work. A rubric does three things that free-form feedback cannot:

1. **Makes expectations explicit.** The agent knows exactly what "good" means before it starts, not after it fails.
2. **Creates comparable data.** A score of 2/4 on "DRY compliance" across ten runs reveals a trend. "The code had some duplication" across ten code reviews reveals nothing.
3. **Enables calibration.** When two scorers disagree, the rubric forces them to point at specific criteria and specific evidence. The disagreement improves both the scorer and the rubric.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js (App Router) + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Styling | Tailwind CSS |
| AI | Claude API (`@anthropic-ai/sdk`) |
| Agent Protocol | Model Context Protocol (`@modelcontextprotocol/sdk`) |
| Testing | Vitest + React Testing Library |

## Roadmap

- [x] Dual-score evaluation with negotiation
- [x] Interactive rubric and task creation
- [x] Run comparison and history
- [x] Per-agent memory compilation and injection
- [x] MCP tools for agent self-assessment
- [x] Token cost tracking and ROI calculation
- [ ] Batch evaluation runs (pass@k consistency)
- [ ] Multi-agent comparison dashboard
- [ ] A/AA/AAA rating badges
- [ ] Rubric library with pre-built templates
- [ ] Academy mode (bordered UI during evaluations)

## Contributing

AAA is in active development. If you work with AI coding agents and care about measuring quality -- not just completion -- contributions are welcome.

If this is useful to you, a star helps others find it.

## License

MIT
