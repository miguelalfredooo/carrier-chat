# Archived: Multi-Agent System

This folder contains code and documentation from carrier-chat's original **three-agent pipeline** architecture (PM → Research → Designer), which has been retired in favor of a single **Head of Product Design** persona.

## Files

- **`agent-prompts-multi-agent.ts`** — Original system prompts for the three-stage gate-check pipeline
  - `getPmPrompt()` — Product Manager gate check (4 gates)
  - `getResearchPrompt()` — Research Strategist gate check (behavioral vs self-report)
  - `getDesignerPrompt()` — Design Strategist with full context from both previous stages
  - Each stage had token budgets keyed by depth level (quick/balanced/in-depth)

- **`SkeletonMessage-multi-agent.tsx`** — Skeleton loader component with per-agent styling
  - PM: 🎯 blue
  - Research: 🔍 green
  - Designer: 💡 purple
  - Used during streaming to show placeholder for each agent's response as it loaded

## Why Archived

The original pipeline was designed as a three-step reasoning system with explicit gates at each stage (BLOCKED logic). The new "Head of Product Design" persona folds all three perspectives into a single coherent agent, removing the explicit handoff and gate mechanics.

If you need to restore the multi-agent approach, these files preserve the original logic and can be referenced.

## Related

- `docs/DECISIONS.md` — Decision log on single-agent simplification
- `lib/agent-prompts.ts` — New single-agent prompt
- `components/chat/SkeletonMessage.tsx` — Replacement (if used at all; currently unused in rendering path)
