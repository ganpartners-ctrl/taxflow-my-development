from __future__ import annotations

import base64
import csv
import hashlib
import json
import re
import sqlite3
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
DB_PATH = DATA_DIR / "bank_statement_extraction.sqlite3"
SCHEMA_PATH = ROOT / "schema.sql"

LEDGER_COLUMNS = [
    "page_no",
    "finance_institute",
    "finance_institute_short_form",
    "company_name",
    "account_number",
    "account_type",
    "statement_date",
    "transaction_date",
    "transaction_line_1",
    "transaction_line_2",
    "transaction_line_3",
    "debit_dr",
    "credit_cr",
    "balance",
]

EXCEL_HEADERS = {
    "page no": "page_no",
    "page no.": "page_no",
    "finance institute": "finance_institute",
    "financial institute": "finance_institute",
    "bank": "finance_institute",
    "bank name": "finance_institute",
    "short form": "finance_institute_short_form",
    "bank short form": "finance_institute_short_form",
    "finance institute short form": "finance_institute_short_form",
    "financial institute short form": "finance_institute_short_form",
    "company name": "company_name",
    "account number": "account_number",
    "account type": "account_type",
    "statement date": "statement_date",
    "date": "transaction_date",
    "transaction line 1": "transaction_line_1",
    "transaction line 2": "transaction_line_2",
    "transaction line 3": "transaction_line_3",
    "debit (dr)": "debit_dr",
    "credit (cr)": "credit_cr",
    "balance": "balance",
}


def init_db() -> None:
    DATA_DIR.mkdir(exist_ok=True)
    UPLOAD_DIR.mkdir(exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
        ensure_ledger_columns(conn)


def ensure_ledger_columns(conn: sqlite3.Connection) -> None:
    existing = {
        row[1]
        for row in conn.execute("PRAGMA table_info(bank_statement_ledger_rows)").fetchall()
    }
    migrations = {
        "finance_institute": "ALTER TABLE bank_statement_ledger_rows ADD COLUMN finance_institute TEXT",
        "finance_institute_short_form": "ALTER TABLE bank_statement_ledger_rows ADD COLUMN finance_institute_short_form TEXT",
    }
    for column, statement in migrations.items():
        if column not in existing:
            conn.execute(statement)


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict | list) -> None:
    body = json.dumps(payload, ensure_ascii=False, default=str).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.end_headers()
    handler.wfile.write(body)


def read_json(handler: BaseHTTPRequestHandler) -> dict:
    length = int(handler.headers.get("Content-Length") or "0")
    if length == 0:
        return {}
    return json.loads(handler.rfile.read(length).decode("utf-8"))


def excel_serial_to_iso(value):
    if not isinstance(value, (int, float)):
        return value
    base = datetime(1899, 12, 30)
    return (base + timedelta(days=int(value))).date().isoformat()


def normalize_money(value):
    if value in ("", None):
        return None
    if isinstance(value, (int, float)):
        return value
    cleaned = str(value).replace(",", "").strip()
    if cleaned in ("", "-"):
        return None
    return float(cleaned)


def normalize_row(input_row: dict, row_no: int) -> dict:
    row = {}
    for key, value in input_row.items():
        normalized_key = EXCEL_HEADERS.get(str(key).strip().lower(), key)
        row[normalized_key] = value

    row["row_no"] = int(row.get("row_no") or row_no)
    row["page_no"] = int(row["page_no"]) if row.get("page_no") not in ("", None) else None
    row["finance_institute"] = row.get("finance_institute") or row.get("source_bank")
    row["finance_institute_short_form"] = (
        row.get("finance_institute_short_form")
        or row.get("bank_short_form")
        or bank_short_form(row.get("finance_institute"))
    )
    row["account_number"] = str(row["account_number"]).strip() if row.get("account_number") not in ("", None) else None
    row["statement_date"] = excel_serial_to_iso(row.get("statement_date"))
    row["transaction_date"] = excel_serial_to_iso(row.get("transaction_date"))
    row["debit_dr"] = normalize_money(row.get("debit_dr"))
    row["credit_cr"] = normalize_money(row.get("credit_cr"))
    row["balance"] = normalize_money(row.get("balance"))
    row["raw_payload"] = json.dumps(input_row, ensure_ascii=False)
    return row


def bank_short_form(finance_institute):
    if not finance_institute:
        return None
    lookup = {
        "public bank": "PBB",
        "public bank berhad": "PBB",
        "public islamic bank": "PBB",
        "malayan banking": "MBB",
        "maybank": "MBB",
        "cimb": "CIMB",
        "hong leong bank": "HLB",
        "rhb bank": "RHB",
        "ambank": "AMB",
    }
    normalized = str(finance_institute).strip().lower()
    return lookup.get(normalized)


def extraction_to_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "source_filename": row["source_filename"],
        "source_bank": row["source_bank"],
        "source_file_sha256": row["source_file_sha256"],
        "status": row["status"],
        "error_message": row["error_message"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def ledger_to_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "extraction_id": row["extraction_id"],
        "row_no": row["row_no"],
        **{col: row[col] for col in LEDGER_COLUMNS},
        "confidence": row["confidence"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


class Api(BaseHTTPRequestHandler):
    server_version = "BankStatementApi/0.1"

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            json_response(self, 200, {"ok": True, "database": str(DB_PATH)})
            return
        if parsed.path == "/api/schema":
            json_response(self, 200, {"ledger_columns": LEDGER_COLUMNS, "excel_headers": EXCEL_HEADERS})
            return
        if parsed.path == "/api/extractions":
            with db() as conn:
                rows = conn.execute("SELECT * FROM bank_statement_extractions ORDER BY id DESC").fetchall()
            json_response(self, 200, [extraction_to_dict(row) for row in rows])
            return
        match = re.fullmatch(r"/api/extractions/(\d+)/ledger-rows", parsed.path)
        if match:
            extraction_id = int(match.group(1))
            with db() as conn:
                rows = conn.execute(
                    "SELECT * FROM bank_statement_ledger_rows WHERE extraction_id = ? ORDER BY row_no",
                    (extraction_id,),
                ).fetchall()
            json_response(self, 200, [ledger_to_dict(row) for row in rows])
            return
        if parsed.path == "/api/ledger-rows":
            query = parse_qs(parsed.query)
            account_number = query.get("account_number", [None])[0]
            sql = "SELECT * FROM bank_statement_ledger_rows"
            params = []
            if account_number:
                sql += " WHERE account_number = ?"
                params.append(account_number)
            sql += " ORDER BY account_number, transaction_date, row_no"
            with db() as conn:
                rows = conn.execute(sql, params).fetchall()
            json_response(self, 200, [ledger_to_dict(row) for row in rows])
            return
        if parsed.path == "/api/ledger-rows.csv":
            self.write_csv()
            return
        json_response(self, 404, {"error": "Not found"})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/extractions":
            payload = read_json(self)
            filename = payload.get("source_filename") or payload.get("filename") or "upload.pdf"
            content_base64 = payload.get("content_base64")
            digest = None
            if content_base64:
                binary = base64.b64decode(content_base64)
                digest = hashlib.sha256(binary).hexdigest()
                (UPLOAD_DIR / f"{digest}_{Path(filename).name}").write_bytes(binary)
            with db() as conn:
                cur = conn.execute(
                    """
                    INSERT INTO bank_statement_extractions
                      (source_filename, source_bank, source_file_sha256, status)
                    VALUES (?, ?, ?, ?)
                    """,
                    (filename, payload.get("source_bank"), digest, "received"),
                )
                extraction_id = cur.lastrowid
                row = conn.execute("SELECT * FROM bank_statement_extractions WHERE id = ?", (extraction_id,)).fetchone()
            json_response(self, 201, {"extraction": extraction_to_dict(row), "expected_rows": LEDGER_COLUMNS})
            return

        match = re.fullmatch(r"/api/extractions/(\d+)/ledger-rows", parsed.path)
        if match:
            extraction_id = int(match.group(1))
            payload = read_json(self)
            rows = payload.get("rows", [])
            if not isinstance(rows, list):
                json_response(self, 400, {"error": "rows must be a list"})
                return
            inserted = []
            with db() as conn:
                exists = conn.execute(
                    "SELECT 1 FROM bank_statement_extractions WHERE id = ?",
                    (extraction_id,),
                ).fetchone()
                if not exists:
                    json_response(self, 404, {"error": "extraction not found"})
                    return
                for index, input_row in enumerate(rows, start=1):
                    row = normalize_row(input_row, index)
                    values = [
                        extraction_id,
                        row["row_no"],
                        *[row.get(col) for col in LEDGER_COLUMNS],
                        row["raw_payload"],
                        row.get("confidence"),
                    ]
                    conn.execute(
                        f"""
                        INSERT INTO bank_statement_ledger_rows
                          (extraction_id, row_no, {", ".join(LEDGER_COLUMNS)}, raw_payload, confidence)
                        VALUES ({", ".join(["?"] * (len(LEDGER_COLUMNS) + 4))})
                        ON CONFLICT(extraction_id, row_no) DO UPDATE SET
                          {", ".join([f"{col}=excluded.{col}" for col in LEDGER_COLUMNS])},
                          raw_payload=excluded.raw_payload,
                          confidence=excluded.confidence
                        """,
                        values,
                    )
                    inserted.append(row)
                conn.execute(
                    "UPDATE bank_statement_extractions SET status = ? WHERE id = ?",
                    ("completed" if rows else "received", extraction_id),
                )
            json_response(self, 201, {"extraction_id": extraction_id, "saved_rows": len(inserted)})
            return
        json_response(self, 404, {"error": "Not found"})

    def write_csv(self) -> None:
        with db() as conn:
            rows = conn.execute(
                "SELECT * FROM bank_statement_ledger_rows ORDER BY account_number, transaction_date, row_no"
            ).fetchall()
        headers = ["extraction_id", "row_no", *LEDGER_COLUMNS]
        output = []
        output.append(headers)
        for row in rows:
            output.append([row[col] for col in headers])

        body_lines = []
        for line in output:
            body_lines.append(",".join(csv_quote(value) for value in line))
        body = ("\r\n".join(body_lines) + "\r\n").encode("utf-8")

        self.send_response(200)
        self.send_header("Content-Type", "text/csv; charset=utf-8")
        self.send_header("Content-Disposition", "attachment; filename=bank_statement_ledger_rows.csv")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)


def csv_quote(value) -> str:
    if value is None:
        return ""
    text = str(value)
    if any(char in text for char in [",", '"', "\r", "\n"]):
        return '"' + text.replace('"', '""') + '"'
    return text


if __name__ == "__main__":
    init_db()
    host = "127.0.0.1"
    port = 5060
    print(f"Bank statement API running at http://{host}:{port}")
    print(f"SQLite database: {DB_PATH}")
    ThreadingHTTPServer((host, port), Api).serve_forever()
