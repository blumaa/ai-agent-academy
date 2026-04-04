---
name: task
description: Create a new evaluation task
disable-model-invocation: true
argument-hint: [task-name]
allowed-tools: AskUserQuestion, Read, Write, Glob
---

# Create a New Task

Create a task description that an agent will be asked to complete during evaluation.

## Steps

### 1. Get the task name

If `$1` is provided, use it as the task name. Otherwise, ask the user what they want the agent to build.

### 2. Write the task description

Ask the user to describe what the agent should build. Help them make it specific enough to evaluate but not so prescriptive that it removes the agent's ability to make quality decisions.

Good task descriptions include:
- What to build (e.g., "a todo app")
- Key features (e.g., "add, complete, delete items, light/dark mode")
- Constraints (e.g., "vanilla HTML/CSS/JS", "single directory", "use React")
- What NOT to include, if relevant

Keep it concise — a few sentences, not a full spec. The rubric measures quality; the task just defines scope.

### 3. Save the task

Write the task description to `tasks/{kebab-case-name}.md`.

### 4. Confirm

Tell the user the task was saved and how to use it:

```
Task saved to: tasks/{name}.md

To evaluate an agent with this task:
  /evaluate {agent-name} rubrics/{rubric}.json tasks/{name}.md
```

Also list available rubrics by scanning `rubrics/` so the user can pick one.
