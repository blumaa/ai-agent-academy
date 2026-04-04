# AAA — AI Agent Academy

**The rubric that rewrites your agent.**

AAA evaluates AI coding agents against rubrics, finds where they fall short, and writes the improvements directly to the agent's config file. Run it again — quality goes up, tokens go down.

## How it works

```
/evaluate ui-engineer rubrics/frontend-ux.json tasks/todo-app.md sonnet
```

1. **Agent does the work** — builds code in a temp directory using the specified agent and model
2. **Agent self-scores silently** — scores its own work against the rubric (you don't see this yet)
3. **You score independently** — review the code and score each criterion blind, without seeing the agent's scores
4. **Compare and negotiate** — scores are revealed side-by-side. Where you disagree, you discuss and agree on a final score
5. **Coaching** — AAA analyzes the gaps and suggests specific improvements to the agent's `.md` file
6. **Apply** — coaching suggestions are written directly to the agent's config
7. **Re-evaluate** — run again. The agent should score higher and use fewer tokens

That's the loop: **evaluate, coach, improve, prove it.**

## The rating system

Agents earn ratings based on their final scores:

| Rating | Avg Score | Meaning |
|--------|-----------|---------|
| **A**  | 2.0 - 2.9 | Basic — gets the job done with issues |
| **AA** | 3.0 - 3.9 | Good — meets standards consistently |
| **AAA**| 4.0 - 5.0 | Excellent — exceeds standards |

## Why this exists

AI coding agents produce inconsistent quality. Sometimes the output is great, sometimes it's garbage. Nobody knows why because there's no systematic way to measure it.

Benchmarks test completion, not quality. They ask "did the agent solve the puzzle?" but not "is this code accessible? performant? well-architected?"

AAA brings rubric-based assessment — a methodology with 40+ years of use in education — to AI agent evaluation. The dual-scoring mechanic (agent self-scores, human scores independently, disagreements are negotiated) produces a signal that no benchmark captures: **what does the agent think "good" means vs. what good actually means?**

That gap is diagnostic. It tells you exactly what to fix in the agent's instructions. And AAA fixes it for you.

## Quick start

### Prerequisites

- [Claude Code](https://claude.ai/code) installed and authenticated
- Agent `.md` files in `~/.claude/agents/` (e.g., `ui-engineer.md`)

### Setup

```bash
git clone <repo-url> AAA
cd AAA
```

That's it. No database, no web server, no npm install. AAA is just Claude Code slash commands + JSON files.

### Run your first evaluation

```bash
claude
```

Then in Claude Code:

```
/evaluate ui-engineer rubrics/frontend-ux.json tasks/todo-app.md sonnet
```

### Create a new rubric

```
/rubric
```

Walks you through creating criteria and level descriptions interactively.

### Create a new task

```
/task
```

Describes what the agent should build during evaluation.

### View past runs

```
/runs
```

Shows all evaluation results and lets you compare runs side-by-side.

## Project structure

```
AAA/
  .claude/skills/
    evaluate/SKILL.md   # The main evaluation command
    rubric/SKILL.md     # Create rubrics interactively
    task/SKILL.md       # Create tasks
    runs/SKILL.md       # View and compare results
  rubrics/              # Rubric definitions (JSON)
    frontend-ux.json
  tasks/                # Task descriptions (Markdown)
    todo-app.md
  runs/                 # Evaluation results (JSON, auto-generated)
```

## What makes this different

**It's not a benchmark.** Benchmarks test pass/fail on puzzles. AAA measures code quality across dimensions that matter in production: accessibility, performance, architecture, security — whatever criteria you define.

**It's not passive.** Most eval tools produce a score and stop. AAA produces a score, diagnoses the gap, generates coaching instructions, and writes them to the agent's config file. The agent actually gets better.

**The dual-scoring is the product.** When the agent scores itself 4/5 on architecture and you score it 2/5, that disagreement reveals exactly what the agent misunderstands about code quality. That's the data that drives improvement.

**Rubrics improve too.** When disagreements reveal that a criterion is ambiguous, you edit the rubric. The rubric gets sharper, the agent gets better, your understanding gets deeper. Three-way calibration.

## Example output

```
=== Evaluation: Frontend UX ===
Agent: ui-engineer | Model: sonnet | Task: todo-app

  Criterion      | Agent | Human | Final | Comment
  ---------------|-------|-------|-------|--------
  Accessibility  |   4   |   3   |   3   | Missing skip-nav and focus styles
  Performance    |   4   |   4   |   4   | Agreed — fast, minimal resources
  Architecture   |   3   |   2   |   2   | Inline styles, no separation

  Average Final Score: 3.00 (AA)
  Tokens: 16,511

=== Comparison with previous run ===
  Previous: avg 2.33, 15,000 tokens
  Current:  avg 3.00, 16,511 tokens
  Quality: +0.67 (+29%)

=== Coaching: How to improve ui-engineer ===
  1. Add to agent instructions: "Always include a skip-navigation
     link and visible focus styles for keyboard users."
  2. Add to agent instructions: "Separate CSS into its own file.
     Use CSS custom properties for theming."

  Apply these to ~/.claude/agents/ui-engineer.md? [yes/no]
```

## Roadmap

- [x] `/evaluate` — dual-score, negotiate, coach, apply
- [x] `/rubric` — interactive rubric creation
- [x] `/task` — task creation
- [x] `/runs` — view and compare results
- [ ] Headless re-run mode (`/evaluate --rerun <run>`)
- [ ] Directory-based scoring (evaluate any code, not just agent output)
- [ ] Rubric library with pre-built templates
- [ ] A/AA/AAA rating badges
- [ ] Academy mode (bordered UI during evaluations)
- [ ] Web dashboard for visualizing trends across runs

## License

MIT
