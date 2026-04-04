---
name: runs
description: View past evaluation runs and compare results
disable-model-invocation: true
argument-hint: [rubric-filter]
allowed-tools: Read, Glob, AskUserQuestion
---

# View Evaluation Runs

Show past evaluation results and compare runs.

## Steps

### 1. Load all runs

Read all JSON files from the `runs/` directory. Parse each one.

### 2. Filter (optional)

If `$1` is provided, filter runs to only those matching that rubric title (case-insensitive partial match).

### 3. Show summary table

Print a table of all runs, sorted by timestamp (newest first):

```
=== Evaluation Runs ===

  #  | Date       | Agent          | Rubric       | Task          | Avg Score | Tokens
  ---|------------|----------------|--------------|---------------|-----------|-------
  1  | 2026-04-02 | ui-engineer    | Frontend UX  | todo-app      |   3.67    | 12,345
  2  | 2026-04-02 | ui-engineer    | Frontend UX  | todo-app      |   2.33    | 15,000
  3  | 2026-04-01 | design-engineer| Frontend UX  | landing-page  |   4.00    |  9,800
```

### 4. Offer comparison

Ask the user if they want to compare two runs using AskUserQuestion. If yes, ask which two run numbers to compare.

### 5. Show comparison

For the selected runs, show:

```
=== Comparison ===
Run 2 (2026-04-02, ui-engineer, avg 2.33, 15000 tokens)
 vs
Run 1 (2026-04-02, ui-engineer, avg 3.67, 12345 tokens)

  Criterion      | Run 2 | Run 1 | Delta
  ---------------|-------|-------|------
  Accessibility  |   2   |   4   |  +2
  Performance    |   3   |   3   |   0
  Architecture   |   2   |   4   |  +2

Quality: +1.34 (+57%)
Tokens:  -2,655 (-18%)
Verdict: Quality up, tokens down!
```

### 6. Offer coaching diff

If both runs used the same agent, show what changed in the agent's instructions between the two runs (if the coaching suggestions were applied). This helps track whether the feedback loop is working.
