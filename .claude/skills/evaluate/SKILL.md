---
name: evaluate
description: Run an agent against a task, dual-score with the human, save results, show comparison
disable-model-invocation: true
argument-hint: [agent-name] [rubric-file]
allowed-tools: Agent, Read, Write, Bash, Glob, Grep, AskUserQuestion
---

# Evaluate Agent Against Rubric

Run an agent to complete a task, then dual-score: the agent self-scores, the human scores independently, disagreements are discussed, and a final score is saved.

## Arguments

- `$1` — agent name (e.g., `ui-engineer`, `backend-architect`). Must match a file in `~/.claude/agents/`.
- `$2` — rubric file path (e.g., `rubrics/frontend-ux.json`). **Required.**
- `$3` — task file path (e.g., `tasks/todo-app.md`). **Required.**
- `$4` — model to use (e.g., `haiku`, `sonnet`, `opus`). Defaults to the current session model.

If any required argument is missing, list available options by scanning `~/.claude/agents/` for agents, `rubrics/` for rubrics, and `tasks/` for tasks, then ask the user to provide them.

## Steps

### 1. Load the rubric

Read the rubric JSON file at `$2`. If the file doesn't exist, list available rubrics in the `rubrics/` directory and ask the user to pick one. The format is:

```json
{
  "title": "...",
  "criteria": [
    { "key": "...", "name": "...", "levels": ["level 1 desc", "level 2 desc", ...] }
  ]
}
```

### 2. Create a work directory

Create a temp directory for the agent to work in:
```bash
mktemp -d
```

### 3. Check what tools the agent might need

Read the agent's `.md` file at `~/.claude/agents/{$1}.md`. Look for any MCP tools or special tools it mentions or is likely to use (e.g., Playwright for browser testing, Chrome DevTools, etc.).

Also read the task description from `$3` and consider what tools the task might require (e.g., a task involving "test in the browser" would need Playwright).

If the agent or task will likely need MCP tools or other tools that require permission, list them and ask the human using AskUserQuestion: "The agent may need these tools during the task. Pre-approve them so the agent doesn't get stuck?" Show the tools as multiSelect options so the human can pick which to allow.

### 4. Run the agent

Use the Agent tool to spawn the agent specified in `$1`. If `$4` is provided, set the model parameter on the Agent tool to that value. In the agent prompt, include any pre-approved tools so the agent knows it can use them without asking. Give it this task:

> Do all your work in the directory: {workDir}
>
> {task description from the task file}

Wait for the agent to complete.

### 4. Agent self-score (SILENT — do not output anything to the user)

After the agent finishes, read the rubric and the code the agent produced. Score each criterion internally but **do NOT print your scores, comments, or reasoning to the user**. Keep them in memory only. The human must not see your scores until after they score independently.

For each criterion:
- Read the level descriptions (1-5, where 1 is worst and 5 is best)
- Examine the agent's code against each level
- Pick the level that best matches
- Note a brief comment and file:line citations

**Do not output any text for this step.** Proceed directly to step 5.

### 5. Show the human where to review the work

Tell the human the work directory path so they can review the code themselves. Also list the files the agent created (just filenames, not contents). Example:

```
The agent's work is at: /var/folders/.../aaanalytics-run-xyz

Files created:
  - index.html

Open it with: open /var/folders/.../aaanalytics-run-xyz/index.html
```

Then wait for the human to review before proceeding to scoring.

### 6. Ask human to score (blind — do NOT show agent's self-scores yet)

For each criterion, show:
- The criterion name
- All 5 level descriptions so the human knows what each score means

Do NOT show the agent's self-score or comment. The human must score independently without being influenced.

Then use AskUserQuestion to ask the human to score each criterion. Ask all criteria in ONE AskUserQuestion call with multiple questions. For each criterion, the options should be levels 1-5 with the level description as the option description.

### 7. Compare and negotiate

After the human scores, compare agent vs human scores for each criterion. Show a table:

```
  Criterion      | Agent | Human | Delta
  ---------------|-------|-------|------
  Accessibility  |   4   |   3   |  -1
  Performance    |   3   |   3   |   0
  Architecture   |   4   |   2   |  -2  ← disagree
```

If any delta has absolute value >= 2 (major disagreement):
- Point out the disagreement
- Explain your (the agent's) reasoning with specific citations
- Ask the human what they think using AskUserQuestion
- Agree on a final score for that criterion

For deltas of 0 or 1, the human's score is the final score.

### 8. Save the result

Write a JSON file to the `runs/` directory in the project root. Filename format: `{timestamp}-{agent-name}.json`

```json
{
  "timestamp": "ISO 8601",
  "agent": "agent name from $1",
  "rubric": "rubric title",
  "task": "the task description",
  "scores": {
    "criterion-key": {
      "agentLevel": 1-5,
      "agentComment": "...",
      "humanLevel": 1-5,
      "finalLevel": 1-5,
      "citations": ["file:line"]
    }
  },
  "avgFinalScore": 0.0,
  "tokens": { "input": 0, "output": 0, "total": 0 }
}
```

For token counts: check if the Agent tool returned usage info. If not, note "unknown".

### 9. Show final results

Print a summary table:

```
=== Evaluation: Frontend UX ===
Agent: ui-engineer
Task: Create a single index.html...

  Criterion      | Agent | Human | Final | Comment
  ---------------|-------|-------|-------|--------
  Accessibility  |   4   |   3   |   3   | Human: missing skip-nav
  Performance    |   3   |   3   |   3   | Agreed
  Architecture   |   4   |   2   |   3   | Negotiated: partial separation

  Average Final Score: 3.00
  Tokens: 12,345
```

### 10. Compare with previous runs

Look for other JSON files in `runs/` that used the same rubric. If any exist, show a comparison with the most recent one:

```
=== Comparison with previous run ===
Previous: 2026-04-01 (ui-engineer, avg 2.3, 15000 tokens)
Current:  2026-04-02 (ui-engineer, avg 3.00, 12345 tokens)

Quality: +0.70 (+30%)
Tokens:  -2,655 (-18%)
Verdict: Quality up, tokens down!
```

### 11. Agent coaching suggestions

Based on the final scores and the gaps between the agent's self-scores and the human's scores, generate actionable suggestions for improving the **agent** (not the model). Focus on:

- **What the agent got wrong**: Where did the agent over-estimate its own work? What did it think was good that the human disagreed with? This reveals blind spots in the agent's prompt/instructions.
- **What to add to the agent's instructions**: Specific rules or reminders that would have prevented the low scores. For example, if accessibility scored low, suggest adding "Always include skip-nav, focus styles, and ARIA landmarks" to the agent's `.md` file.
- **What to prioritize differently**: If the agent spent effort on things that didn't matter for the rubric and missed things that did, suggest re-prioritizing.
- **Patterns from previous runs**: If there are past runs, note recurring weaknesses — criteria that consistently score low suggest a systemic gap in the agent's instructions.

Format as:

```
=== Coaching: How to improve ui-engineer ===

1. Add to agent instructions: "Always include a skip-navigation link and visible focus styles for keyboard users."
   Reason: Accessibility scored 3 but could reach 4 with these additions. Agent self-scored 4, suggesting it doesn't know these are required.

2. Add to agent instructions: "Separate CSS into its own file and use CSS custom properties for theming."
   Reason: Architecture scored 2 — everything was inline. Agent needs explicit guidance on file separation.

3. Pattern: Accessibility has scored 3 across 2 runs. This is a persistent gap — consider adding a checklist to the agent's prompt.
```

Save the coaching suggestions to the run JSON file in a `coaching` field.

Then ask the human using AskUserQuestion: "Apply these suggestions to the agent file (~/.claude/agents/{agent-name}.md)?"

If yes, read the agent's current `.md` file, append the suggestions as new rules/instructions at the end (under a `## Learnings from evaluations` section if one doesn't exist yet), and write the updated file. This way the agent improves for the next run automatically.
