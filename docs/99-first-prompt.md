# Setup and prompts for Claude Code

## One-time setup
1. Extract this kit into the root of the new backend project, so `CLAUDE.md`, `.claude/`, and `docs/` sit at the top level.
2. Connect the Context7 MCP server. For example: `claude mcp add --transport http context7 https://mcp.context7.com/mcp` (add `--scope user` to make it available in every project, and see the official Context7 README for the optional API key).
3. Start Claude Code from the project root by running `claude`.
4. Check the setup:
   - `/context`: `CLAUDE.md` and the two files from `.claude/rules/` should appear under **Memory files**.
   - `/skills`: `generate-tasks`, `plan-task`, `hint`, and `review-task` should be listed.
   - `/mcp`: Context7 should be connected.

## Step 1: Understand (no code, no tasks)
Optionally run this step in plan mode (read-only). Then send:

```
Read, in this order: docs/00-project-brief.md, docs/01-scope.md, docs/02-decisions.md, and docs/source/internship-brief.md. Also follow the rules in CLAUDE.md and .claude/rules.

Do NOT write any code and do NOT generate tasks yet.

Reply with:
1. Your understanding of the project and of my goal, in your own words.
2. The MVP scope in your own words: what is in, what is deferred, what is out.
3. Conflicts, gaps, or ambiguities between the brief and the scope/decision docs.
4. The questions you need me to answer before generating tasks.
5. Your proposed phases and a rough number of tasks per phase.

Then wait for my answers.
```

## Step 2: Generate tasks (after you answered the questions)
Type:

```
/generate-tasks
```

It writes `docs/tasks/00-index.md` plus one file per phase, with `P1-T01` (folder structure and project setup) first, and lists every assumption it made.

## Step 3: Work loop (per task)
`/plan-task` -> write the code yourself (`/hint` if stuck) -> `/review-task` -> repeat until "Ready".
