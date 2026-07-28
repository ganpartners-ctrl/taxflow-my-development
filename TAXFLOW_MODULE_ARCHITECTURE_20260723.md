# TaxFlow MY Module Architecture - 2026-07-23

## Purpose

This note defines the next stable architecture for TaxFlow MY so Form C, Form P, Form B, Form BE, Form M, CP204, HK schedules, e-Invoice collection, tax computation, and draft/final PDF exports can be built without mixing data or inventing figures.

## Core Rule

Fixed profile data may be prefilled from prior forms and KYC. Year-specific amounts must come from reviewed source documents, confirmed ledger extraction, working papers, FA/HP/CA schedules, or confirmed tax computation data. Every amount should keep source, review status, and audit trail.

## Shared Data Model

- Client profile: legal name, TIN, registration or ID number, address, MSIC/business activity, form type, tax agent reference.
- KYC contacts: primary PIC, second PIC, email, phone, communication preference.
- Assessment year: YA, basis period, status, form type, workflow step, approval state.
- Documents: uploaded source file, document type, YA, version, extraction payload, PDF/download links, review status.
- Ledger: full transactions, account summaries, TB, PL, BS, mapping profile, source row reference.
- Working papers: account-level schedule, ledger transaction lines, client confirmation, internal check, query status.
- FA/HP/CA: prior-year rollover, current-year additions, disposals, HP interest/principal, CA/BC, reconciliation.
- Tax computation: business income, interest, deemed interest, add-backs, deductions, donation, CA, HP, CP204 and final tax payable.
- Return forms: Form C, P, B, BE, M and HK schedules, generated only from confirmed data.
- Mail center: outgoing request, client reply, attachment, due date reminder, status and evidence link.
- e-Invoice: authorized client connection, daily sync log, inbound/outbound documents, reconciliation to ledger.

## Return Form Modules

### Form C

Company return. Requires directors, shareholders, beneficial owners, tax computation, CA/HP, HK schedules, and source-backed Form C pages. Balance sheet uses company statement of financial position logic: assets are normally debit-positive, liabilities and equity are normally credit-positive, and retained earnings debit means negative/accumulated loss.

### Form P

Partnership return. Requires partnership profile, precedent partner, partner list, allocation basis, CP30 support, and handoff to each partner Form B. Do not use retained earnings. Balance sheet/capital statement logic must separate partnership assets and liabilities from each partner capital/current account, drawings, salaries, interest on capital, and profit allocation.

### Form B

Resident individual with business. Requires identity, contact, spouse/employer details, business income, tax computation and reviewed relief/claim figures. Do not use retained earnings. Balance sheet support is business-source based where accounts are prepared; use proprietor capital/current account logic and do not mix personal assets/liabilities into business accounts unless the form or working paper specifically requires them.

### Form BE

Resident individual without business. Requires identity, employment, spouse, bank/profile details and reviewed relief/claim figures. Normally no business balance sheet engine is required; only relief, income, tax deduction, tax credit, and supporting schedules should be produced.

### Form M

Non-resident individual. Requires passport, nationality, residence country, Malaysian address/representative, and reviewed income/tax figures. Do not use retained earnings unless the taxpayer is actually a company handled under Form C. Balance sheet support depends on the Malaysian source of income and should use source/owner capital logic where accounts are prepared.

## Balance Sheet And Statement Logic

Balance sheet calculation must be form-aware:

- Form C: company statement of financial position. Assets: positive debit, negative credit. Liabilities: positive credit, negative debit. Equity: positive credit, negative debit. Retained earnings debit is negative retained earnings/accumulated loss. The statement must reconcile assets to equity plus liabilities after current-year profit/loss transfer.
- Form P: partnership balance sheet and partners' capital/current account movement. Retained earnings must not appear. Each partner has a capital/current account movement: opening balance plus capital introduced plus share of profit/loss plus salary/interest entitlement less drawings/distributions, according to the partnership agreement and CP30 support.
- Form B: sole-proprietor/business-source statement where required. Retained earnings must not appear. Use proprietor capital/current account movement: opening capital plus capital introduced plus current-year business profit/loss less drawings/private expenses where accounts are prepared.
- Form BE: no trading balance sheet by default.
- Form M: statement support only if the Malaysian-source activity requires it. Retained earnings must not appear for an individual non-resident source. Use owner/source capital logic where accounts are prepared.

The system should store a `statement_model` per assessment year: `company`, `partnership`, `sole_proprietor`, `employment_only`, or `non_resident_source`. All TB, PL, BS and export formulas should use this model.

## Completion Gates

Final PDF export should be locked until:

1. KYC profile is confirmed.
2. Directors/shareholders/beneficial owners are completed where required.
3. Ledger is uploaded and confirmed.
4. TB, PL and BS are reviewed and mapped.
5. Working papers are posted and reviewed.
6. FA/HP/CA is confirmed.
7. Tax computation is reviewed.
8. Return form pages and HK schedules are reviewed.
9. Approval is completed.

## Export Rules

- Draft copy: watermark/status "Draft", editable data, review comments visible where needed.
- Final copy: locked version, timestamped, generated from confirmed data only.
- Archive: include source documents, extraction JSON, ledger Excel, TB/PL/BS, WP, FA/HP/CA, tax comp, forms, HK schedules, mail evidence, and audit trail.

## e-Invoice Rule

Intermediary access can normally retrieve only documents submitted by the intermediary. To collect all client e-Invoice data, the system needs client company-authorized access or another permitted company-level authorization path. Store credentials/tokens securely, log daily syncs, and reconcile collected invoices to ledger and tax schedules.

## Current UI Added

The current `taxflow_v5.html` includes a new Compliance Hub panel to track:

- Form C/P/B/BE/M readiness
- Tax computation source gates
- CP204 workflow plan
- e-Invoice collection plan
- HK forms library
- draft/final document export plan
- completion gates before final filing pack
