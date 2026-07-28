# Claude Handoff - TaxFlow MY

This repository is a local-development handoff for the TaxFlow MY prototype.

## First Rule

Do not commit or upload client source documents, PDFs, Excel files, ZIP handoff archives, logs, browser profiles, or dependency caches. They are intentionally ignored in `.gitignore`.

## Run Locally

```powershell
npm install
npm run start
```

Open:

```text
http://127.0.0.1:5174/taxflow_v5.html
```

For OCR/general-ledger extraction, run a second terminal:

```powershell
npm run ocr-proxy
```

The browser app should call:

```text
http://127.0.0.1:5050/convert?delivery=link
```

If it calls `http://127.0.0.1:5174/api/convert`, that is wrong for the local static server and will return `404`.

## Current Main Files

- `taxflow_v5.html` - main single-file TaxFlow MY app.
- `local-ocr-proxy.cjs` - local proxy that forwards upload requests and downloads output files.
- `gl_extractor.py` - local standard-ledger PDF extraction helper.
- `preview-server.cjs` - local static server for the app.
- `TAXFLOW_MODULE_ARCHITECTURE_20260723.md` - architecture notes.
- `.codex/skills/tax-return-prefill-engine/SKILL.md` - extraction/prefill data model notes.

## Product Direction

TaxFlow MY is a Malaysia tax/audit preparation workflow. The user expects accountant-grade logic, not mock/demo shortcuts.

Core modules discussed and partially built:

- Client Profile / KYC, including PIC contacts, shareholders, directors, beneficial owners and up to 3 business activities.
- Upload Prior Year, extracting prior Form C and tax computation data into editable review tables before posting.
- Upload Ledger, showing original PDF pages side-by-side with extracted Excel/ledger data.
- Trial Balance, Profit & Loss, Balance Sheet and AI Mapping.
- Analysis of Accounts, replacing the old Working Papers name.
- Deemed Interest schedule.
- FA / HP / CA with prior-year rollover and current-year additions.
- Tax Status, including losses carried forward and tax payable/refundable history.
- Tax instalment notice workflow for CP204, CP204A, CP204B, CP500 and CP600.
- Compliance Hub, Mail Center, Admin and Master Admin placeholders.
- Return form engine for Form C, P, B, BE and M.
- HK forms/export-control concepts.

## High-Risk Areas To Fix First

1. Prior-year tax computation extraction must reliably capture directors, shareholders, beneficial owners, CA/FA/HP, add-back notes, CP204/tax status and loss carried-forward schedules.
2. Profile Extract must show all extracted data side-by-side, editable, with user confirmation before posting to the database.
3. Ledger-derived TB/P&L/BS must reconcile to source document totals. Revenue should be credit-side by nature, expenses debit-side, and BS sign logic must respect asset/liability/equity treatment.
4. Analysis of Accounts should be generated from AI Mapping account pushes and must show source ledger transaction lines, user-editable workings, query transfer and export.
5. Every schedule should have save/edit/review/approval states, and final output should be exportable as draft/final PDF.

## Testing Checklist

- Start preview server and open `taxflow_v5.html`.
- Start OCR proxy and confirm health:

```text
http://127.0.0.1:5050/health
```

- Upload a ledger PDF and confirm the app calls port `5050`, not `5174/api`.
- Confirm PDF preview renders pages.
- Confirm Excel download and PDF download links work through the proxy.
- Confirm posting ledger data updates TB, P&L, BS and AI Mapping.
- Confirm prior-year Form C / tax computation extraction fills profile extraction rows before posting.

