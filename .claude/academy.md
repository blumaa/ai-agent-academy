# AI Agent Academy — Quality Gate Protocol

When the AI Agent Academy MCP server is enabled, follow this protocol for every task.

## Before starting work

1. Call `get_lessons` with the project directory name as `project_id`. If past lessons exist, review them and apply them proactively to the current task.

## Before completing any task

1. Call `list_rubrics` and ask the user which rubric to evaluate against.
2. Complete the task as normal.
3. Before reporting the task as done, call `get_rubric` with the chosen slug to load the scoring criteria and level descriptions.
4. Self-evaluate your work against every criterion in the rubric. Score each 1-5 honestly, citing specific file:line evidence for each score.
5. Call `run_specs` with your rubric slug, scores, and reasoning.
6. If the quality gate **passes**: continue to the learning step.
7. If the quality gate **fails**: read the failure details — each one shows what you scored, what that level means, and what the next level up requires. Fix the specific issues, then re-evaluate by calling `run_specs` again.
8. Repeat until you pass.

## After passing the quality gate

1. Reflect on what you learned during this task. Present it to the user:

   > **This is what I learned as an agent during this process:**
   > [specific lessons — what you got wrong, what you improved, what you'd do differently next time]
   >
   > **Do you want to commit this to memory?**

2. If the user approves, call `save_lesson` with the project_id, rubric, scores, failures, and the lesson text.
3. These lessons are retrieved by `get_lessons` at the start of future tasks, closing the learning loop.

## Rules

- Never skip evaluation when this MCP server is enabled.
- Be honest — cite specific evidence for every score. If you can't cite evidence, the score is too high.
- A score of 3 means "meets basic standards" and is the minimum passing score.
- If you fail, fix the actual issues before re-evaluating. Do not inflate scores to pass.
- When outputting the scorecard, display the `display` field from the `run_specs` response verbatim.
- Always present learnings and ask before saving — never save silently.
