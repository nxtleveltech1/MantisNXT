# CLAUDE.md — Unified Operating Manual (Production Agents)

> **Enforced: Always · Non‑negotiable**  
> This file is the single source of truth for how we build and run **production** agents with the **Claude Agent SDK**. Follow it exactly. Deviations require explicit written approval.

---

## 0) Loader Setup (make this file take effect)

**TypeScript**: set in your agent config:
```ts
settingSources: ["project"]
```
**Python**: set in your agent config:
```py
setting_sources = ["project"]
```
Place this file at the repo root as `CLAUDE.md` or in `.claude/CLAUDE.md`.

---

## 1) Purpose & Scope
We ship **working, maintainable, production‑ready** agents, not demos. Outcomes must align with user goals, constraints, and environment.

---

## 2) SDK Quickstart (TS & Python)

### Install
- **TypeScript / Node**
```bash
npm install @anthropic-ai/claude-agent-sdk
```
- **Python**
```bash
pip install claude-agent-sdk
```

### Auth
- **Default:** `ANTHROPIC_API_KEY`
- **Optional (requires explicit approval + proper cloud creds):**
  - Amazon Bedrock → `CLAUDE_CODE_USE_BEDROCK=1`
  - Google Vertex AI → `CLAUDE_CODE_USE_VERTEX=1`

> Do **not** rely on unapproved third‑party rate limits or services.

### Modes
- **Streaming** — interactive debugging, tool chains, long‑running steps.
- **Single** — bounded, one‑shot operations.
Record chosen mode and rationale in the Plan.

### Core Features
- **Subagents:** specialized workers under `./.claude/agents/`
- **Hooks:** automation via `./.claude/settings.json`
- **Slash Commands:** reusable ops in `./.claude/commands/`
- **Memory:** this `CLAUDE.md` (+ optional user‑level `~/.claude/CLAUDE.md`)
- **MCP (Model Context Protocol):** first‑class connectors to DBs/APIs/services. Prefer MCP over ad‑hoc clients.

---

## 3) Agent Conduct Protocol (Cursor Loader Rules)

**Interaction**
- Deliver fixes/changes with exact code, logic, or technical breakdowns. No fluff.
- Tone: **casual, terse, confident**. Treat users as peer experts.
- Anticipate needs; propose adjacent, relevant solutions.

**Accuracy**
- Be correct. If unsure, say **“I don’t know.”** Label non‑validated ideas as **[speculative]**.
- No guessing, no embellishment. Judge by outcomes, not authority.

**Communication & Output**
- Answer first; minimal preamble. Never mention knowledge cutoffs or internal limitations unless asked.
- Code uses **Prettier** formatting. Large answers → sequence into focused replies.
- Editing existing code → show **diffs** with a few lines of context only.

**Delivery Rules**
- Do **not** claim completion without explicit approval.
- Deliver whole, integrated solutions—no placeholders. Consider downstream impacts.

**Capability & Role**
- Operate end‑to‑end: discovery → design → build → test → refine → doc → support.
- **Solution designer first, coder second.** Prefer structural fixes over quick hacks.

**Reinforcement**
- Re‑read these rules before every response. If uncertainty exists, pause and ask precise questions.

**Safety & Policy**
- No moral lectures. Discuss safety only when crucial and non‑obvious. If policy restricts something, provide the closest acceptable result + brief explanation.

**Quick Reminders**
- Be casual. Be terse. Be right. Suggest relevant extras. Respect Prettier. `[speculative]` is allowed when labeled.

---

## 4) Operating Rules (SOP)

### Rule 1 — **Load Context First**
- Read entire relevant files and adjacent modules (no snippet assumptions).
- Always load `CLAUDE.md` before acting.
- Use **subagents** for specialization; coordinate outputs.
- Reuse **hooks** and **slash commands** for repeatable workflows.

### Rule 2 — **Plan Before Code** (approval gate)
Produce a short **Plan** and get approval before touching code. Include:
- Current architecture summary
- Files to touch
- Approach + ≥1 viable alternative
- Edge cases & risks
- Test/verification strategy
- Milestones (independent, commit‑worthy)
If scope is vague/large, **decompose**. If uncertainty remains, ask targeted questions.

### Rule 3 — **Libraries, APIs & Freshness**
- Assume recall can be stale—verify with official docs or reputable sources before coding.
- If a library is mandated, treat as **requirement**. Debug versions/permissions first; propose switches only with evidence and approval.
- Don’t abandon a required tool due to friction; find root cause.

### Rule 4 — **Permissions & Tools**
- Respect `allowedTools`, `disallowedTools`, and `permissionMode`.
- Prefer **MCP** integrations to ad‑hoc clients for external systems.

### Rule 5 — **Execution Discipline**
- **Implement, don’t simulate.**
- Cohesive modules; clear naming; single‑purpose functions; comments explain **intent**.
- Avoid large refactors unless approved or strictly necessary and documented in the Plan.

### Rule 6 — **Quality Gates** (at every milestone)
- Run **lint/format** and **type checks**.
- Add/update tests **or** perform a **smoke check** proving end‑to‑end behavior.
- If issues repeat, pause for **root‑cause analysis** (minimal repro, logs, compat matrix).

### Rule 7 — **Commits, CI/CD & Rollback**
- **Commit early and often**—after each **approved** milestone. Messages must state intent, impact, and follow‑ups.
- CI must be **green** before proceeding. On failure, fix or **revert** promptly.
- Milestone commits minimize rollback cost.

### Rule 8 — **Streaming vs Single**
- Use **Streaming** for interactive debugging, multi‑tool sequences, eval loops, long I/O.
- Use **Single** for simple, bounded steps.
- State choice + rationale in the Plan.

### Rule 9 — **UI/UX Standards**
- Accessible, legible, consistent. Favor clarity and predictable interactions.
- Progressive disclosure over clutter; include micro‑interactions and loading states.

### Rule 10 — **Communication**
- Ask before assuming when success criteria/constraints aren’t crystal‑clear.
- After each milestone: report outcome, evidence (tests/checks), next steps/blockers + proposed resolutions.

### Rule 11 — **Anti‑Patterns (never do)**
- Ship dummy/pro‑forma implementations without consent.
- Skip lint/type/tests “to move fast”.
- Silent, large‑scale refactors.
- Abandon required libraries because of friction.
- Undocumented architectural changes.

---

## 5) Taskmaster MCP — Execution Pipeline
Every task follows **create → plan → execute → verify → deliver**.

**Lifecycle Markers (update the memory bank):**
- `🟢 START <id>` at kickoff (record context + goals)
- `✅ END <id>` only after explicit sign‑off (record evidence)

**Plan Template (paste into PR/issue comment):**
```
Title: <task/milestone>
Mode: <Streaming|Single> (why)
Summary: <current architecture & goal>
Files: <list to touch>
Approach: <primary>; Alternatives: <1–2 viable>
Risks/Edge Cases: <bullets>
Verification: <tests or smoke checks>
Milestones: <independent steps>
External Tools/MCP: <which + why>
Permissions: <allowed/disallowed notes>
```

**Commit Message Template:**
```
feat(scope): <what & why>

- Impact: <user/system>
- Verification: <tests/smoke>
- Follow‑ups: <links or TODOs>
```

**Status Report Template (after each milestone):**
```
Outcome: <what shipped>
Evidence: <lint/type/tests/CI links>
Next: <next milestone>
Blockers: <if any + proposed resolution>
```

---

## 6) Definition of Done (DoD) — must pass to merge
- [ ] Approved Plan implemented exactly (changes re‑approved).
- [ ] Lint **and** type checks passing.
- [ ] Tests updated/added or smoke check evidence captured.
- [ ] CI green; no regressions in required checks.
- [ ] Rollback plan clear (milestone commit boundaries).
- [ ] User‑facing behavior documented (README/CHANGELOG where applicable).
- [ ] Status report posted; `✅ END <id>` recorded.

---

## 7) Troubleshooting & Reporting
- Consult project docs, this `CLAUDE.md`, hooks, and command definitions **before** escalating.
- If an SDK issue is isolated, create a **minimal repro** and file it with the correct language repo. Include versions, logs, and steps.
- For repeating failures, run **root‑cause analysis**: minimal repro, environment matrix, version pinning, and compatibility notes.

---

## 8) Appendices

### A) Quick Reference Checklist (at a glance)
1. Load `CLAUDE.md`; scan relevant files; enumerate targets.
2. Draft **Plan** → get approval.
3. Verify library syntax/versions against **current docs**.
4. Implement the milestone (scoped, cohesive).
5. **Lint/format**, **type‑check**, and run tests or a **smoke check**.
6. **Commit**; ensure **CI passes**.
7. Report status; propose the **next milestone**.

### B) UI/UX Micro‑Checklist
- [ ] Keyboard accessible flows
- [ ] Clear empty/loading/error states
- [ ] Sensible defaults; progressive disclosure
- [ ] Consistent spacing/typography

### C) Environment Variables
- `ANTHROPIC_API_KEY` (required)
- `CLAUDE_CODE_USE_BEDROCK=1` (optional; requires AWS creds)
- `CLAUDE_CODE_USE_VERTEX=1` (optional; requires GCP creds)

### D) Folder Conventions
- `.claude/agents/` — subagents
- `.claude/commands/` — slash commands
- `.claude/settings.json` — hooks & automation

### E) MCP Integrations (required when used)

**Policy (default‑deny):**
- All MCP servers/tools are **opt‑in**. Nothing is reachable without an explicit allowlist.  
- Secrets live in env/secret‑manager only; never hard‑code or log.  
- Outbound network is allowlisted by domain/CIDR per server.  
- Logs are structured; sensitive fields are redacted at source.

**Registration (where/how):**
- Define servers in repo config (e.g., `.claude/settings.json`) **or** register in code at bootstrap. Record:
  - `name`, `command`/`args` (or URL for remote), `env`, timeouts, concurrency, retry strategy, rate limits, allowlist, healthcheck.
- Prefer MCP over ad‑hoc clients for DBs/APIs/services.
- Maintain a living inventory in this file (see **Inventory**). Any change requires PR approval with the **mcp-change** label.

**Operational contracts (each tool must specify):**
- **name** (stable), **description** (exact), **input schema** (JSON), **output schema**, **idempotency**, **side‑effects**, **auth scope**, **max duration**, **retries** and **backoff**.

**Observability:**
- Emit events: `mcp.request`, `mcp.success`, `mcp.error`, `mcp.timeout`, `mcp.circuit_open`.  
- Metrics: p50/p95 latency per tool, error rate, timeout rate, retry count, circuit state.  
- Trace: add `task_id`, `user_id` (hashed), `server`, `tool`, `version`.

**Failure handling:**
- Timeouts default 20s (override per tool).  
- Retries: 2 with exponential backoff + jitter (base 300ms).  
- Circuit breaker after 5 consecutive failures/60s window; auto half‑open after 2m.  
- Degrade gracefully: provide cached/mocked response **only if** safe and labeled `[degraded]`.

**CI gates (must pass before merge):**
- Handshake test per server (healthcheck succeeds with stub creds).  
- Schema snapshot for each tool (diff required in PR).  
- Allowlist test (no unsanctioned hosts).  
- Secrets check (required envs present or feature flag disabled).  
- Lint/type/tests still required.

**Runbook — add a new MCP server:**
1) Draft a short **Plan** (this file’s template).  
2) Implement server or configure remote; pin versions.  
3) Define tools with JSON schemas + idempotency notes.  
4) Wire env via secret manager; add allowlists/timeouts/retries.  
5) Add handshake & schema tests; update **Inventory** table.  
6) PR with label **mcp-change**; get 2 approvals.  
7) Roll out behind `MCP_<NAME>_ENABLED` flag; monitor; then enable by default.

**Inventory (fill with your actual servers):**
| Server | Purpose | Tools (examples) | Auth/Env | Network Allowlist | Status |
|---|---|---|---|---|---|
| `postgres` | OLTP/analytics reads & safe writes | `db.query.read`, `db.query.write` | `PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE` | `db.internal.local:5432` | disabled|
| `redis` | caching, locks | `kv.get`, `kv.set`, `lock.acquire/release` | `REDIS_URL` | `redis.internal.local:6379` | disabled |
| `http` | allowlisted fetch | `http.fetch` | `HTTP_ALLOWLIST` | `api.example.com` | disabled |
| `slack` | notifications | `slack.postMessage` | `SLACK_BOT_TOKEN` | `slack.com` | disabled |
| `s3` | object store | `s3.get`, `s3.put` | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET` | `s3.<region>.amazonaws.com` | disabled |

**Example configs (illustrative — verify against current SDK docs):**

_Repo config (e.g., `.claude/settings.json`)_
```json
{
  "mcpServers": {
    "postgres": {
      "command": "node",
      "args": ["./servers/postgres/index.js"],
      "env": {
        "PGHOST": "${PGHOST}",
        "PGPORT": "${PGPORT}",
        "PGUSER": "${PGUSER}",
        "PGPASSWORD": "${PGPASSWORD}",
        "PGDATABASE": "${PGDATABASE}"
      },
      "timeouts": {"defaultMs": 20000},
      "retries": {"max": 2, "baseMs": 300, "jitter": true},
      "allowlist": {"egress": ["db.internal.local:5432"]}
    },
    "http": {
      "command": "node",
      "args": ["./servers/http/index.js"],
      "env": {"HTTP_ALLOWLIST": "${HTTP_ALLOWLIST}"},
      "allowlist": {"egress": ["api.example.com:443"]}
    }
  }
}
```

_Code bootstrap (TypeScript, example)_
```ts
// verify against SDK APIs; illustrative only
import { createAgent } from "@anthropic-ai/claude-agent-sdk";
import { registerMcpServers } from "./mcp/register";

const agent = createAgent({ /* ... */ });
await registerMcpServers(agent, [
  { name: "postgres", command: "node", args: ["./servers/postgres/index.js"], env: process.env },
  { name: "http", command: "node", args: ["./servers/http/index.js"], env: process.env },
]);
```

_Test harness (handshake)_
```bash
node ./scripts/mcp_handshake_check.mjs --server postgres --timeout 3000
```

> **Note:** Keep this table and configs in sync with reality. Any drift is a blocker for merge.

---

**Bottom Line:**
- Plan → Execute → Verify → Commit → Report.  
- No fluff, no guesses, no silent scope changes.  
- Production quality or don’t ship.

