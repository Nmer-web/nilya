# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `.specify/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]

**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]

**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]

**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]

**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]

**Project Type**: [e.g., library/cli/web-service/mobile-app/compiler/desktop-app or NEEDS CLARIFICATION]

**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]

**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]

**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates derived from `.specify/memory/constitution.md` v1.0.0. Answer each with evidence, not
intent. A ❌ against a NON-NEGOTIABLE principle (I, II, VII) blocks the plan outright and cannot be
carried into Complexity Tracking.

| # | Gate | Status |
|---|------|--------|
| I (NON-NEGOTIABLE) | Every listing write sets the new condition; every listing read filters on it; no resale language anywhere in the feature | [ ] |
| II (NON-NEGOTIABLE) | No invented products, sellers, prices, ratings, counts, locations, orders, messages or payment states; no seed rows added for the UI; empty states designed; every route parameter is a real UUID from a real row | [ ] |
| III | Every table, column and enum member the feature touches is confirmed present in the live schema / `src/lib/database.types.ts`; anything the schema cannot express is reported as a limitation rather than worked around | [ ] |
| IV | Feature does not modify Supabase schema/RLS/publications, Realtime channels, or the Stripe functions and webhook contract — or names the proven defect and records the approval | [ ] |
| V | Everything rendered as interactive is wired and persists; no dead controls; verified against a second independent account | [ ] |
| VI | Approved Nilya Green/Amber/Ink/Muted/Surface brand system used by semantic role and logo rules preserved; loading, empty, error and offline states specified; accessibility roles, labels and state defined for every control | [ ] |
| VII (NON-NEGOTIABLE) | Plan states how each behaviour will be runtime-verified, and names what will remain unverifiable and why | [ ] |
| Platform | Expo SDK 57 versioned docs consulted; no server secrets in the bundle; payment work sequenced after the rest of the flow; Stripe test mode only | [ ] |

## Project Structure

### Documentation (this feature)

```text
.specify/specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
