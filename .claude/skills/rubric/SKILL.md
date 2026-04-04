---
name: rubric
description: Create a new evaluation rubric interactively
disable-model-invocation: true
argument-hint: [rubric-name]
allowed-tools: AskUserQuestion, Read, Write, Glob
---

# Create a New Rubric

Walk the user through creating a rubric for evaluating AI agent work.

## Steps

### 1. Get the rubric name

If `$1` is provided, use it as the rubric name. Otherwise, ask the user what they want to evaluate (e.g., "frontend UX", "API design", "test coverage").

### 2. Understand the domain

Ask the user to describe in a sentence or two what this rubric should measure. For example: "I want to evaluate how well an agent builds accessible, performant frontend code."

### 3. Suggest criteria

Based on the user's description, suggest 3-5 criteria that make sense for this rubric. Show them and ask the user to confirm, remove, add, or modify. Use AskUserQuestion with multiSelect to let them pick which criteria to keep, plus an "Other" option to add their own.

Each criterion should have:
- A short key (lowercase, hyphenated, e.g., `error-handling`)
- A display name (e.g., "Error Handling")

### 4. Generate level descriptions

For each confirmed criterion, generate 5 level descriptions (1 = worst, 5 = best). Show them to the user and ask if they want to adjust any. The levels should follow a clear progression:

- **Level 1**: Complete absence or failure
- **Level 2**: Minimal/inconsistent effort
- **Level 3**: Meets basic standards (this is the "passing" threshold)
- **Level 4**: Exceeds standards, thorough
- **Level 5**: Exemplary, best-in-class

### 5. Save the rubric

Write the rubric as a JSON file to `rubrics/{kebab-case-name}.json`:

```json
{
  "title": "Rubric Title",
  "criteria": [
    {
      "key": "criterion-key",
      "name": "Criterion Name",
      "levels": [
        "Level 1 description",
        "Level 2 description",
        "Level 3 description",
        "Level 4 description",
        "Level 5 description"
      ]
    }
  ]
}
```

### 6. Confirm

Tell the user the rubric was saved and how to use it:

```
Rubric saved to: rubrics/{name}.json

To evaluate an agent with this rubric:
  /evaluate {agent-name} rubrics/{name}.json tasks/{task}.md
```
