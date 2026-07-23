# Klasio — Supabase (backend)

> **Status: aspirational — lands with Phase 1.** This directory is a placeholder for
> the production backend. No migrations, RLS policies or RPCs have been written yet.
> The app in the repo root is the **prototype** (localStorage-backed, no Supabase).
> The authoritative design lives in [`docs/Klasio-Data-Layer-Reference.md`](../docs/Klasio-Data-Layer-Reference.md)
> and the phased build order in [`docs/Klasio-Development-Plan.md`](../docs/Klasio-Development-Plan.md).
> Where the prototype and the docs conflict, [`docs/Klasio-Reconciliation.md`](../docs/Klasio-Reconciliation.md) is the arbiter.

## What will live here (from Phase 0 / Phase 1 onward)

- `migrations/` — one file per table, with its RLS policies in the same file
- `functions/` — Postgres RPCs (audited multi-table transactions)
- `tests/` — the two-centre RLS isolation harness (Account A vs Account B)
- `seed.sql` — demo data per slice

## Domains (≈64 tables across nine + three domains)

Tenancy & identity · Academic · Grades & assessment · Staff & pay · Homework ·
Invoicing (families + VAT) · Communications · Files & storage · Platform & operations ·
**Student Reports & Teacher Feedback** · **Tracking** · **Lesson planner**.

## No AI (locked decision #12)

There are no AI features, dependencies or tables anywhere in the platform. There is
**no `ai_feedback` table** and no Homework-AI endpoints — the Student Reports & Teacher
Feedback domain is the successor to the deleted AI-feedback feature. See the
Data-Layer Reference §10.

## Local dev (planned)

Per locked decision #8: Supabase CLI pushes migrations to a cloud dev project
(`klasio-dev`, eu-west-2 / London) — no Docker for local dev.
