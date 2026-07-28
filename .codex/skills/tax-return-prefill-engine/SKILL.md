---
name: tax-return-prefill-engine
description: Malaysia tax return prefill workflow for TaxFlow MY. Use when Codex must read prior-year Form C, Form P, Form B, Form BE, Form M, tax computation PDFs, EA forms, or related LHDN schedules, extract carry-forward data, map it into the correct client-type database, and prepare editable current-year recommendations for user confirmation without mixing company, partnership, sole proprietor, employment, and non-resident logic.
---

# Tax Return Prefill Engine

## Core Rule

Detect the taxpayer / return type first, then extract into that return type only. Do not apply Form C company fields, retained earnings, directors, shareholders, or CP204 logic to Form B, BE, P, or M unless the document itself requires it.

## Return-Type Database Routing

- Form C: company database. Use company profile, directors, shareholders, beneficial owners, tax computation, HK forms, FA / HP / CA, CP204 / CP204A / CP204B, working papers, mail evidence, document exports.
- Form P: partnership database. Use partnership profile, partners, allocation basis, partner capital/current accounts, partner tax handoff, FA / HP / CA where relevant, working papers, mail evidence, document exports.
- Form B: individual business database. Use taxpayer profile, spouse/dependants, business sources, proprietor capital/current account, reliefs, CP500, FA / HP / CA where relevant, working papers, mail evidence, document exports.
- Form BE: employment-only individual database. Use taxpayer profile, EA/PCB, employment income, reliefs, rebates, donations, mail evidence, document exports. No business balance sheet by default.
- Form M: non-resident database. Use passport, nationality, country of residence, representative details, Malaysian-source income, withholding tax, CP500/payment follow-up where relevant, mail evidence, document exports.

## Extraction Workflow

1. Identify document type and assessment year from title, header, file name, and known LHDN form labels.
2. Extract stable prior-year data: taxpayer identity, TIN/tax file no., registration/ID/passport no., address, basis period, business activity/source, PIC/contact details where available.
3. Extract type-specific tables:
   - Form C: directors, shareholders, beneficial owners, controlled transaction Q&A, tax computation figures, CA/HP/FA schedules.
   - Form P: partners, sharing ratio, partner income allocation, capital/current accounts.
   - Form B: business sources, adjusted income, relief references, CP500/payment information.
   - Form BE: employer, EA/PCB, reliefs and rebates.
   - Form M: non-resident identity, representative, Malaysian-source income and withholding.
4. Normalize addresses into four presentation lines: `address1`, `address2`, `address3`, `address4`.
5. Store extracted values as `lastYear` reference data first. For current year, generate recommendations separately and mark them `review_required`.
6. Let the user edit and confirm before posting into client profile, tax computation, working papers, FA / HP / CA, forms, or final PDF exports.

## Accuracy Controls

- Preserve source evidence: file name, page number if known, text snippet/row reference, extraction method, and confidence/status.
- If a value is unclear, leave it blank or mark `review_required`; do not invent.
- For year-sensitive amounts, do not roll forward blindly. Use prior-year C/F only where the schedule expects a B/F in the current year.
- For company retained earnings, use Form C only. For partnership use partner capital/current accounts. For sole proprietor use proprietor capital/current account. For BE no balance sheet by default. For M use Malaysian-source balances only where accounts exist.
- Tax computation treatment must preserve Malaysian tax logic: S.33(1) allowability, S.39 add-backs, S.4(c) income, HP interest/principal split, CA review, donation review, penalties, entertainment restriction, professional fee capital/revenue review, and source evidence.

## Output Contract

Return or write data using these groups:

- `clientProfile`
- `returnType`
- `yearAssessment`
- `basisPeriod`
- `lastYearReference`
- `currentYearRecommendation`
- `directors`
- `shareholders`
- `beneficialOwners`
- `partners`
- `individualProfile`
- `employmentIncome`
- `businessSources`
- `taxComputation`
- `faHpCa`
- `cpNotice`
- `hkSchedules`
- `queries`
- `sourceEvidence`
- `reviewStatus`

Every row must be editable and must support user confirmation before posting.
