const API_BASE = "http://127.0.0.1:5060";

const elements = {
  file: document.querySelector("#pdfFile"),
  fileName: document.querySelector("#fileName"),
  fileMeta: document.querySelector("#fileMeta"),
  financeInstitute: document.querySelector("#financeInstitute"),
  financeShortForm: document.querySelector("#financeShortForm"),
  companyName: document.querySelector("#companyName"),
  accountNumber: document.querySelector("#accountNumber"),
  extractButton: document.querySelector("#extractButton"),
  refreshButton: document.querySelector("#refreshButton"),
  apiDot: document.querySelector("#apiDot"),
  apiStatus: document.querySelector("#apiStatus"),
  jobStatus: document.querySelector("#jobStatus"),
  ledgerBody: document.querySelector("#ledgerBody"),
  rowCount: document.querySelector("#rowCount"),
  debitTotal: document.querySelector("#debitTotal"),
  creditTotal: document.querySelector("#creditTotal"),
  closingBalance: document.querySelector("#closingBalance"),
};

let currentExtractionId = null;

function money(value) {
  const number = Number(value || 0);
  return number.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function setBusy(isBusy) {
  elements.extractButton.disabled = isBusy;
  elements.refreshButton.disabled = isBusy;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json();
}

async function fileToBase64(file) {
  if (!file) return null;
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < bytes.byteLength; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

function buildSampleRows() {
  const financeInstitute = elements.financeInstitute.value.trim() || "Public Bank";
  const shortForm = elements.financeShortForm.value.trim() || "PBB";
  const companyName = elements.companyName.value.trim() || "GIGAWAY SOLUTION SDN BHD";
  const accountNumber = elements.accountNumber.value.trim() || "3812626130";

  return [
    {
      page_no: 1,
      finance_institute: financeInstitute,
      finance_institute_short_form: shortForm,
      company_name: companyName,
      account_number: accountNumber,
      account_type: "RM Cm Current Account-i",
      statement_date: "2026-04-30",
      transaction_date: "2026-03-31",
      transaction_line_1: "Balance From Last Statement",
      transaction_line_2: "",
      transaction_line_3: "",
      debit_dr: null,
      credit_cr: null,
      balance: 1143.14,
    },
    {
      page_no: 1,
      finance_institute: financeInstitute,
      finance_institute_short_form: shortForm,
      company_name: companyName,
      account_number: accountNumber,
      account_type: "RM Cm Current Account-i",
      statement_date: "2026-04-30",
      transaction_date: "2026-04-03",
      transaction_line_1: "DEP-ECP 213881",
      transaction_line_2: "IMEPS20260403100002271549096 MBB",
      transaction_line_3: "INTEGRATED LOGISTICS SOLUTIONS SDN. BHD. MBB",
      debit_dr: null,
      credit_cr: 1738.8,
      balance: 2881.94,
    },
  ];
}

function renderRows(rows) {
  if (!rows.length) {
    elements.ledgerBody.innerHTML = '<tr><td colspan="12" class="empty-row">Upload and extract a statement to view rows.</td></tr>';
  } else {
    elements.ledgerBody.innerHTML = rows.map(row => `
      <tr>
        <td>${row.page_no ?? ""}</td>
        <td>${row.finance_institute ?? ""}</td>
        <td>${row.finance_institute_short_form ?? ""}</td>
        <td>${row.company_name ?? ""}</td>
        <td>${row.account_number ?? ""}</td>
        <td>${row.transaction_date ?? ""}</td>
        <td>${row.transaction_line_1 ?? ""}</td>
        <td>${row.transaction_line_2 ?? ""}</td>
        <td>${row.transaction_line_3 ?? ""}</td>
        <td class="num">${row.debit_dr == null ? "" : money(row.debit_dr)}</td>
        <td class="num">${row.credit_cr == null ? "" : money(row.credit_cr)}</td>
        <td class="num">${row.balance == null ? "" : money(row.balance)}</td>
      </tr>
    `).join("");
  }

  const debitTotal = rows.reduce((sum, row) => sum + Number(row.debit_dr || 0), 0);
  const creditTotal = rows.reduce((sum, row) => sum + Number(row.credit_cr || 0), 0);
  const closing = rows.length ? rows[rows.length - 1].balance : 0;
  elements.rowCount.textContent = String(rows.length);
  elements.debitTotal.textContent = money(debitTotal);
  elements.creditTotal.textContent = money(creditTotal);
  elements.closingBalance.textContent = money(closing);
}

async function checkApi() {
  try {
    await request("/health");
    elements.apiDot.className = "status-dot ok";
    elements.apiStatus.textContent = "API connected";
  } catch {
    elements.apiDot.className = "status-dot bad";
    elements.apiStatus.textContent = "API offline";
    elements.jobStatus.textContent = "Start the API with python .\\bank-statement-api\\app.py";
  }
}

async function refreshRows() {
  const path = currentExtractionId
    ? `/api/extractions/${currentExtractionId}/ledger-rows`
    : "/api/ledger-rows";
  const rows = await request(path);
  renderRows(rows);
}

async function extractStatement() {
  setBusy(true);
  try {
    const file = elements.file.files[0];
    const payload = {
      source_filename: file?.name || "GIGA-PBB 2026-04.pdf",
      source_bank: elements.financeInstitute.value.trim() || "Public Bank",
      content_base64: await fileToBase64(file),
    };
    const created = await request("/api/extractions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    currentExtractionId = created.extraction.id;
    const rows = buildSampleRows();
    await request(`/api/extractions/${currentExtractionId}/ledger-rows`, {
      method: "POST",
      body: JSON.stringify({ rows }),
    });
    elements.jobStatus.textContent = `Extraction #${currentExtractionId} saved ${rows.length} ledger rows.`;
    await refreshRows();
  } catch (error) {
    elements.jobStatus.textContent = error.message;
  } finally {
    setBusy(false);
  }
}

elements.file.addEventListener("change", () => {
  const file = elements.file.files[0];
  if (!file) return;
  elements.fileName.textContent = file.name;
  elements.fileMeta.textContent = `${(file.size / 1024).toFixed(1)} KB selected`;
});

elements.extractButton.addEventListener("click", extractStatement);
elements.refreshButton.addEventListener("click", async () => {
  setBusy(true);
  try {
    await refreshRows();
    elements.jobStatus.textContent = "Rows refreshed.";
  } catch (error) {
    elements.jobStatus.textContent = error.message;
  } finally {
    setBusy(false);
  }
});

checkApi();
refreshRows().catch(() => renderRows([]));
