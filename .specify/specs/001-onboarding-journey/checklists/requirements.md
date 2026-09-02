# Specification Quality Checklist: Onboarding Journey

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-17
**Feature**: [spec.md](../spec.md)

## Content Quality

- [~] No implementation details (languages, frameworks, APIs) — **deliberate exception**, see Notes
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — all 3 resolved in [research.md](../research.md)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined — US1–US3; US4 removed with its limitation recorded
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria — 30 FRs, all resolved
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [~] No implementation details leak into specification — confined to Data Reality, see Notes

## Notes

**On the implementation-detail exception.** The Data Reality section names tables, columns, grants
and configuration values. This is normally disqualifying in a specification. It is retained here
deliberately because two authorities require it: the feature brief instructs that any preference
without a database representation be reported as an exact schema limitation rather than worked
around, and Constitution Principle III requires the schema be verified rather than assumed. Stating
"interests cannot be saved" without naming what was checked would be an unverifiable claim. The
functional requirements themselves remain free of implementation detail.

**Verification basis.** Every claim in Data Reality was read from the live database on 2026-08-17
(column privileges, RLS policies, check constraints, triggers, row counts, category rows) and from
the committed auth configuration. None was taken from `database.types.ts`, which is hand-written and
carries only a partial projection of `profiles`.

**A correction this audit produced.** `profiles.avatar_color` is a real, member-updatable column
that the existing profile update path does not cover. Onboarding can legitimately set it, which is
what makes FR-021's photo-less avatar honest rather than decorative.

**Clarifications — resolved without an answer.** `/speckit-plan` was invoked before Q1–Q3 were
answered, so all three were resolved in [research.md](../research.md) by applying the constitution
and the verified schema rather than by guessing at preference. Q1 removed User Story 4 entirely.
Each decision records its alternatives and is reversible; **Q1 is the one to review first**, because
it is the only one that changed scope.

**One further finding from planning.** `delivery_options` shows SAWA's real operating geography —
domestic delivery in `FR` and `SD`, international `**` everywhere else. That turned the country
question from an editorial guess into a projection of real data.
