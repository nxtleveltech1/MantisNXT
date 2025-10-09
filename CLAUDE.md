# CLAUDE.md

> Project memory & operating rules for agents built with the **Claude Agent SDK**.
> Ensure this file is loaded by enabling:
> - TypeScript: `settingSources: ['project']`
> - Python: `setting_sources=['project']`

---

## Purpose

This project uses the **Claude Agent SDK** to build **production-ready** agents (not demos). The agent must deliver working, maintainable outcomes aligned to user goals and project constraints.

---

## SDK Quickstart

### Installation
- **TypeScript / Node**
  ```bash
  npm install @anthropic-ai/claude-agent-sdk
  ```
- **Python**
  ```bash
  pip install claude-agent-sdk
  ```

### Forms & Modes
- **SDKs:** TypeScript (`@anthropic-ai/claude-agent-sdk`), Python (`claude-agent-sdk`)
- **Modes:**  
  - **Streaming** — for interactive, tool-heavy, or long-running steps  
  - **Single** — for one-shot, simple operations

### Core Features
- **Subagents:** place specialized agents under `./.claude/agents/`
- **Hooks:** automation via `./.claude/settings.json`
- **Slash Commands:** reusable commands in `./.claude/commands/`
- **Memory:** this file (`CLAUDE.md` or `.claude/CLAUDE.md`) + optional user-level `~/.claude/CLAUDE.md`
- **MCP (Model Context Protocol):** connect databases, APIs, and services as first-class tools

### Authentication
- **Default:** `ANTHROPIC_API_KEY`
- **Optional providers (with explicit approval/config):**
  - **Amazon Bedrock:** `CLAUDE_CODE_USE_BEDROCK=1` (+ AWS creds)
  - **Google Vertex AI:** `CLAUDE_CODE_USE_VERTEX=1` (+ GCP creds)
- Do **not** rely on unapproved third-party rate limits for products built on this SDK.

---

## Operating Rules

### 1) Load Context First
- Read **entire relevant files** (and adjacent modules) before proposing changes. Avoid snippet-based assumptions.
- Always load project/user **CLAUDE.md** before acting.
- Use **subagents** for specialized tasks; coordinate their outputs.
- Reuse **hooks** and **slash commands** for repeatable workflows.

### 2) Plan Before Code
Produce a short **Plan** and get approval **before writing code**:
- Current architecture summary
- Files to touch
- Approach + viable alternatives
- Edge cases & risks
- Test/verification strategy
- Milestones (independent, commit-worthy)

If scope is vague/large, **decompose**. If uncertainty remains, ask **targeted questions**.

### 3) Libraries, APIs & Freshness
- Assume internal recall may be stale—**verify with official docs or reputable sources** before coding.
- If the user mandates a library, treat it as a **requirement**. Debug usage/version/permissions first; propose switches only with evidence and approval.
- Do **not** abandon a requested tool because “it’s not working”; identify root causes (syntax, patterns, versions, environment).

### 4) Permissions & Tools (SDK)
- Respect `allowedTools`, `disallowedTools`, and `permissionMode`. Request elevation if needed.
- Prefer **MCP** integrations over ad-hoc clients when connecting external systems.

### 5) Execution Discipline
- **Implement, don’t simulate.** No “this is how it would look” unless explicitly asked.
- Organize code into cohesive modules; clear naming; single-purpose functions; comments that explain **intent** (not the obvious).
- Avoid large refactors unless explicitly approved or strictly necessary and documented in the Plan.

### 6) Quality Gates (each milestone)
- Run **lint/format** and **type checks** after major edits.
- Add/update tests or perform a **smoke check** proving the milestone works end-to-end.
- If issues repeat, pause and perform **root-cause analysis** (minimal repro, logs, compat matrix) rather than shotgun fixes.

### 7) Commits, CI/CD & Rollback Safety
- **Commit early and often**—after each **approved** milestone—with clear messages (intent, impact, follow-ups).
- Ensure CI/GitHub Actions are **green** before proceeding. On failure, fix or revert promptly.
- Use milestone commits to minimize rollback cost if subsequent steps fail.

### 8) Streaming vs Single Mode (policy)
- **Streaming:** interactive debugging, multi-tool sequences, eval loops, long I/O.
- **Single:** simple, bounded steps.
- If UX/perf is affected, state the chosen mode and rationale.

### 9) UI/UX Standards
- Produce interfaces that are accessible, legible, and consistent. Favor clarity, sensible defaults, and predictable interactions.
- Use progressive disclosure over clutter; design micro-interactions and loading states.

### 10) Communication
- **Ask before assuming** when success criteria or constraints aren’t crystal clear.
- After each milestone: report outcome, evidence (tests/checks), and next steps/blockers with proposed resolutions.

### 11) Anti-Patterns (Do Not)
- Ship dummy/pro-forma implementations without explicit consent.
- Skip lint/type/tests “to move fast.”
- Perform silent, large-scale refactors.
- Abandon a required library due to friction.
- Make undocumented architectural changes.

---

## Troubleshooting & Reporting

- Consult project docs, this **CLAUDE.md**, hooks, and command definitions before escalating.
- If you isolate an SDK issue, create a minimal repro and file it with the appropriate language repo (TypeScript or Python).

---

## Milestone Checklist (Quick Reference)

1. Load **CLAUDE.md**; scan relevant files end-to-end; enumerate files to change.  
2. Draft **Plan** → get approval.  
3. Verify library syntax/versions against **current docs**.  
4. Implement the milestone (scoped, cohesive).  
5. **Lint/format**, **type-check**, and run tests or a **smoke check**.  
6. **Commit** with a clear message; ensure **CI passes**.  
7. Report status; propose the **next milestone**.

---

## Appendix: Related Resources

- TypeScript SDK & Python SDK usage in this repo (see package/requirements and project scripts).
- MCP integrations (list configured servers/tools, if any).
- CI jobs and required checks (document names/links if applicable).
- Project-specific `allowedTools` / `disallowedTools` (document here if enforced).
