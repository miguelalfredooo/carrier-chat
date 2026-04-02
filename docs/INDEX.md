# Documentation Index

**Last updated:** 2026-04-01

When something breaks, start here. This page maps every operational and architectural doc in the project so you can find context in under 60 seconds.

---

## ⚙️ Local Development Setup

| Document | Purpose |
|---|---|
| [LOCAL_SETUP.md](LOCAL_SETUP.md) | direnv configuration, environment variables, auth setup, troubleshooting |

**Read this first** if you're getting auth conflicts or environment variable issues.

---

## 🔴 Critical Fixes & Known Issues

| Document | Purpose | Last Updated |
|---|---|---|
| [BUGS.md](BUGS.md) | Log of all significant bugs fixed — symptom, root cause, fix, test | 2026-04-01 |
| [CHAT_FLICKER_FIX.md](CHAT_FLICKER_FIX.md) | Chat message flicker race condition — detailed root cause analysis | 2026-04-01 |

## 🏗️ Architecture & Patterns

| Document | Purpose | Last Updated |
|---|---|---|
| [DECISIONS.md](DECISIONS.md) | Architectural and design decisions — what was decided, why, alternatives | 2026-04-01 |
| [CHAT_PATTERNS.md](../lib/CHAT_PATTERNS.md) | Rules for chat code — optimistic updates, loadMessages guard, no timing hacks | 2026-04-01 |
| [carrier-prd.md](carrier-prd.md) | Product requirements and design overview | 2026-03-24 |
| [carrier-design-ops.md](carrier-design-ops.md) | Design Ops module specifications | 2026-03-24 |
| [crew-agents.md](crew-agents.md) | Crew agent system architecture | 2026-03-24 |

## 🧪 Tests & Validation

| Test | Purpose | Location |
|---|---|---|
| Chat Flicker Regression Test | Ensures message flicker never returns | `test/chat-flicker.test.mjs` |

**Run regression tests:**
```bash
node --test test/chat-flicker.test.mjs
```

## 📋 Standard Operating Procedures

| Task | Document | Location |
|---|---|---|
| Making chat changes | See CHAT_PATTERNS.md + PR checklist | `.github/pull_request_template.md` |
| Debugging a bug | Check BUGS.md for similar symptoms | `docs/BUGS.md` |
| Understanding a design choice | Check DECISIONS.md | `docs/DECISIONS.md` |

## 🚀 Quick Links

- **Before touching ChatInterface.tsx:** Read `lib/CHAT_PATTERNS.md` (10 min)
- **If messages are flickering:** See `docs/CHAT_FLICKER_FIX.md` (5 min)
- **If adding a new feature:** Check `docs/DECISIONS.md` for related patterns (10 min)
- **If fixing a bug:** Log it in `docs/BUGS.md` for future reference (2 min)

## 📝 How to Maintain This Index

1. **When you fix a bug:** Add entry to `BUGS.md`, link it here
2. **When you make an architectural decision:** Add entry to `DECISIONS.md`, link it here
3. **When you create new docs:** Add to the appropriate section in this index
4. **Update the "Last Updated" date** for any section you modify

---

## Project Overview

**Carrier** — AI-powered product design research workspace. Three top-level areas:
- **Sessions** (`/`) — Create sessions, vote on options, reveal results
- **Insights** (`/research`) — Research hub with observations, segments, synthesis
- **Design Ops** (`/design-ops`) — Design ops workspace with modules and history

**Chat subsystem** — AI-powered design research chat (used in insights workflow)

---

## Critical Context

The chat message flicker bug (April 2026) revealed a pattern: **timing-dependent race conditions in state management** can hide for months until network conditions align.

**Lesson:** Always document why code works the way it does. A comment saying "don't call loadMessages after send" can prevent weeks of debugging when someone tries to "fix" it.

See `CHAT_FLICKER_FIX.md` and `CHAT_PATTERNS.md` for the full story.
