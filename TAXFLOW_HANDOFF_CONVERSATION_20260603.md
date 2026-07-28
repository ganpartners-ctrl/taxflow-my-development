# TaxFlow MY Handoff - 2026-06-03

## Current Working Location

- Project folder: `C:\Users\User\Documents\Hospitalities software`
- Main app: `taxflow_v5.html`
- Local preview URL: `http://127.0.0.1:5174/taxflow_v5.html`
- Local proxy: `local-ocr-proxy.cjs`
- GL extractor: `gl_extractor.py`

## How To Run

1. Start the local preview/proxy from this folder.
2. Open `http://127.0.0.1:5174/taxflow_v5.html`.
3. Upload the NOVUTAL standard ledger PDF.
4. Confirm the extracted ledger before posting to TB / P&L / BS.

## Major Issues Raised In The Conversation

- Browser calls to the OCR API failed from HTTPS/mixed-content/CORS, so OCR must go through a local proxy.
- API response shape changed: Excel/PDF links need to be proxied and downloaded from local server.
- PDF preview must show all pages, support zoom choices, and allow PDF download.
- Extracted ledger must show full ledger data and the original PDF side by side.
- Extracted Excel grand totals must match document grand totals:
  - Grand total from document: debit 6,857,948.28, credit 6,857,948.28.
  - Grand total calculated from Excel rows: debit 6,857,948.28, credit 6,857,948.28.
  - Grand total check: OK.
- Trial Balance must show LY and TY debit/credit:
  - LY should use brought-forward balance.
  - TY should use final closing balance.
  - Both LY and TY must balance.
- P&L and BS must not be lumped together; modules were split into TB, P&L, and BS.
- P&L should follow accounting format:
  - Revenue
  - Cost of sales
  - Gross profit
  - Other income
  - Selling and distribution expenses
  - Administrative expenses
  - Results from operating activities
  - Finance income
  - Finance costs
  - Profit before tax
- Mapping must not send balance-sheet accounts into P&L.
- Revenue lines such as `CONSULTATION & MANAGEMENT SERVICES` must be CR and appear in Revenue.
- Current assets mapped to BS must not leak into P&L.
- Tax treatment such as S.33(1), S.39 add-back, S.4(c), HP interest/principal, CA review, donation review must remain available for tax schedules, but tax treatment alone must not decide the P&L section.
- AI Mapping should show all ledger accounts and all ledger transaction lines, with filters like Excel.
- Working papers should receive full ledger transactions for posted accounts, not just one summary line.
- FA / HP / CA should use prior-year tax computation opening balances and roll R.E. C/F to current-year R.E. B/F.
- FA / HP / CA should bring in non-current asset ledger additions for the current year and reconcile to BS non-current assets.
- User wants a stable customer-demo build, light mode by default, and pop-out/minimize/restore screen controls.

## Latest Fixes Applied

### GL Extractor

- Added document/calculated/check grand total rows to the Excel output.
- Corrected debit/credit inference using running account balances.
- Verified `5000-C001 CONSULTATION & MANAGEMENT SERVICES` is treated as a credit revenue line rather than debit.

### P&L Mapping Logic

Updated `fsPLBucket()` in `taxflow_v5.html`:

- Balance sheet classes are excluded from P&L.
- Revenue stays in Revenue.
- Explicit COS names and schedules go to Cost of sales.
- Admin account names override mistaken Cost of Sales mappings.
- Selling/distribution is based on actual selling/distribution wording.
- Normal operating/admin accounts go to Administrative expenses.
- Tax treatment wording such as allowable, S.33(1), S.39 no longer pushes accounts into Cost of sales.

## Known Risk / Still Needs Review

- User mapping history in local storage may carry old wrong mappings. If the UI still looks wrong after code fixes, clear or retrain mapping for that client.
- Need a full end-to-end test from fresh upload:
  1. Upload ledger PDF.
  2. Confirm Excel totals match PDF totals.
  3. Post to TB.
  4. Confirm LY/TY TB balances.
  5. Confirm all Revenue accounts appear in P&L Revenue.
  6. Confirm all COS accounts appear in Cost of sales.
  7. Confirm admin/selling split.
  8. Confirm BS has no P&L leakage.
- Current app is a large single HTML file; further development should avoid large unrelated redesigns and focus on accounting correctness first.

## Files Included In The Handoff Zip

- `taxflow_v5.html`
- `gl_extractor.py`
- `local-ocr-proxy.cjs`
- `preview-server.cjs`
- `package.json`
- `start-ocr-proxy.cmd`
- `NOVUTAL-Standard Ledger 2024.pdf`
- `TAXFLOW_HANDOFF_CONVERSATION_20260603.md`

