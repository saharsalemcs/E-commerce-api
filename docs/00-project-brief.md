# Project brief

## What this is
A solo **learning project**: build the **backend** of a single-merchant e-commerce store as a REST API with Node.js. The requirements come from a mentored-internship brief (`source/internship-brief.md`) that describes a team project covering backend, web, mobile, and an AI assistant. Here, only the **backend** part is built, by one person, to practice and master backend fundamentals.

## The learner
- Final-year Computer Science student. About two years of frontend experience (React / Next.js) and previous full-stack projects built on Supabase.
- Currently learning Node.js backend through Jonas's Node.js course. Completed up to **section 10 (authentication and authorization)** and paused to practice by building this project.
- Has **not yet studied**: webhooks, payment gateways, file upload, automated testing, Swagger/OpenAPI. These are deferred (see `01-scope.md`).
- Wants the **start of every task to come from their own thinking**, not from copying a tutorial or from AI-generated code.

## Why an AI assistant is involved
The assistant is a **mentor / senior engineer**, not a code writer:
- The learner writes the code. The assistant writes code only when explicitly asked (typically boilerplate or configuration).
- The assistant reviews plans and finished work: correctness, what must be fixed, what could be improved, whether the approach is modern and suitable, and whether it is consistent with the other tasks.
- The learner wants to learn new things while applying what they already know.

## Sources
- Requirements: `source/internship-brief.md` (original PDF: `source/internship-brief.pdf`).
- Scope for this project: `01-scope.md` (overrides the brief where they differ).
- Decisions and open questions: `02-decisions.md`.
- Reference only: the Index Academy public repo https://github.com/Boghdady/udemy-build-ecommerce-api-using-nodejs (an Arabic Node.js e-commerce API course). It is **not** a source of requirements. Only the extras listed in `01-scope.md` were taken from it.

## How we work (three steps)
1. **Understand.** The assistant reads everything, then reports its understanding, gaps, and questions. No code and no tasks yet. (Prompt in `99-first-prompt.md`.)
2. **Generate tasks.** After the learner answers, the assistant writes the task files in `tasks/`, using the `/generate-tasks` skill (`.claude/skills/generate-tasks/SKILL.md`).
3. **Work loop, per task.**
   - `/plan-task`: the learner brings their own plan, the mentor reviews it.
   - The learner codes. `/hint` when stuck.
   - `/review-task` when done. Repeat until it returns "Ready".
