# Bank Statement Extraction API

This folder is a starter API/database scaffold for bank statement extraction.
The ledger table follows the columns in `bank statement ledger requirement.xlsx`.

## Ledger Columns

| Excel header | Database field |
| --- | --- |
| page no | page_no |
| Finance institute | finance_institute |
| Short form | finance_institute_short_form |
| Company name | company_name |
| account number | account_number |
| account type | account_type |
| statement date | statement_date |
| date | transaction_date |
| transaction line 1 | transaction_line_1 |
| transaction line 2 | transaction_line_2 |
| transaction line 3 | transaction_line_3 |
| Debit (DR) | debit_dr |
| Credit (Cr) | credit_cr |
| Balance | balance |

## Run Locally

```powershell
python .\bank-statement-api\app.py
```

The API runs at:

```text
http://127.0.0.1:5060
```

SQLite database file:

```text
bank-statement-api\data\bank_statement_extraction.sqlite3
```

## Basic Flow

Create an extraction job:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:5060/api/extractions -ContentType 'application/json' -Body '{"source_filename":"GIGA-PBB 2026-04.pdf","source_bank":"Public Bank"}'
```

Save rows extracted by OCR/parser:

```powershell
$payload = Get-Content .\bank-statement-api\sample-ledger-payload.json -Raw
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:5060/api/extractions/1/ledger-rows -ContentType 'application/json' -Body $payload
```

List rows:

```powershell
Invoke-RestMethod http://127.0.0.1:5060/api/ledger-rows
```

Download CSV:

```text
http://127.0.0.1:5060/api/ledger-rows.csv
```

## Extraction Adapter

The current scaffold stores extraction jobs and rows. The next piece to add is a parser adapter that reads PDF/OCR output and produces this JSON shape:

```json
{
  "rows": [
    {
      "page_no": 1,
      "finance_institute": "Public Bank",
      "finance_institute_short_form": "PBB",
      "company_name": "GIGAWAY SOLUTION SDN BHD",
      "account_number": "3812626130",
      "account_type": "RM Cm Current Account-i",
      "statement_date": "2026-04-30",
      "transaction_date": "2026-04-03",
      "transaction_line_1": "DEP-ECP 213881",
      "transaction_line_2": "IMEPS20260403100002271549096 MBB",
      "transaction_line_3": "INTEGRATED LOGISTICS SOLUTIONS SDN. BHD. MBB",
      "debit_dr": null,
      "credit_cr": 1738.80,
      "balance": 2881.94
    }
  ]
}
```
