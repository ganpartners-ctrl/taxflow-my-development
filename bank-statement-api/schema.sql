PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS bank_statement_extractions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_filename TEXT NOT NULL,
  source_bank TEXT,
  source_file_sha256 TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bank_statement_ledger_rows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  extraction_id INTEGER NOT NULL REFERENCES bank_statement_extractions(id) ON DELETE CASCADE,
  row_no INTEGER NOT NULL,

  page_no INTEGER,
  finance_institute TEXT,
  finance_institute_short_form TEXT,
  company_name TEXT,
  account_number TEXT,
  account_type TEXT,
  statement_date TEXT,
  transaction_date TEXT,
  transaction_line_1 TEXT,
  transaction_line_2 TEXT,
  transaction_line_3 TEXT,
  debit_dr NUMERIC,
  credit_cr NUMERIC,
  balance NUMERIC,

  raw_payload TEXT,
  confidence NUMERIC,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (extraction_id, row_no)
);

CREATE INDEX IF NOT EXISTS idx_bank_statement_ledger_rows_extraction
  ON bank_statement_ledger_rows (extraction_id, row_no);

CREATE INDEX IF NOT EXISTS idx_bank_statement_ledger_rows_account_date
  ON bank_statement_ledger_rows (account_number, transaction_date);

CREATE TRIGGER IF NOT EXISTS trg_bank_statement_extractions_updated
AFTER UPDATE ON bank_statement_extractions
FOR EACH ROW
BEGIN
  UPDATE bank_statement_extractions
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_bank_statement_ledger_rows_updated
AFTER UPDATE ON bank_statement_ledger_rows
FOR EACH ROW
BEGIN
  UPDATE bank_statement_ledger_rows
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;
