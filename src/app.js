const patients = [
  {
    name: "Mr. K. Raman",
    mrn: "MRN-09331",
    age: 62,
    department: "ICU Ward",
    bed: "ICU-03",
    doctor: "Dr. Sarah",
    nurse: "Nurse Amir",
    diagnosis: "Sepsis monitoring",
    status: "Critical",
    risk: "Critical oxygen",
    vitals: "SpO2 88%, BP 92/58",
    note: "Ventilator linked to asset VNT-009. Doctor approval required for transfer."
  },
  {
    name: "Aisha Tan",
    mrn: "MRN-10294",
    age: 7,
    department: "Pediatric Ward",
    bed: "P2-14",
    doctor: "Dr. Lim",
    nurse: "Nurse Hana",
    diagnosis: "Bronchopneumonia",
    status: "Review",
    risk: "Fever alert",
    vitals: "39.1 C, SpO2 96%",
    note: "Guardian consent pending. Weight-based dose check required."
  },
  {
    name: "Chen Mei",
    mrn: "MRN-11840",
    age: 34,
    department: "Doctor Clinic",
    bed: "Queue 04",
    doctor: "Dr. Ong",
    nurse: "Clinic Team",
    diagnosis: "Follow-up review",
    status: "Waiting",
    risk: "Normal",
    vitals: "BP 122/78",
    note: "SOAP note draft available. Follow-up slot open at 14:30."
  },
  {
    name: "Nur Iman",
    mrn: "MRN-10018",
    age: 51,
    department: "General Ward",
    bed: "W1-08",
    doctor: "Dr. Devi",
    nurse: "Nurse Mei",
    diagnosis: "Post-op care",
    status: "Stable",
    risk: "Medication due",
    vitals: "Temp 37.2 C",
    note: "Pending discharge checklist and 08:15 medication scan."
  }
];

const viewTitles = {
  command: "Command Center",
  doctor: "Doctor Clinic",
  clinicNurse: "Clinic Nurse",
  doctorWard: "Doctor Ward",
  nurse: "Nurse Ward",
  pediatric: "Pediatric Ward",
  icu: "ICU Ward",
  adminSetup: "Administrator Setup",
  beds: "Visual Bed Board",
  medication: "Medication Harness",
  inventory: "Department Inventory",
  assets: "Asset Control",
  reports: "Report Upload",
  audit: "Audit Trail"
};

const state = {
  view: "command",
  selectedPatient: patients[0],
  query: "",
  toast: "",
  modal: null,
  exportReport: null,
  adminSetupMode: "list",
  auditRows: [
    ["07:18", "patient.viewed", "Dr. Sarah", "MRN-09331", "Allowed: ICU encounter assignment"],
    ["07:15", "critical.alert", "System", "ICU-03", "SpO2 below ICU threshold; doctor and nurse notified"],
    ["07:11", "medication.blocked", "Pharmacist Lee", "MRN-10294", "Pediatric dose requires current weight"],
    ["07:05", "report.uploaded", "Nurse Hana", "MRN-10294", "chest-xray.pdf linked to encounter"],
    ["06:58", "access.denied", "Ward Nurse", "MRN-09331", "Failed department gate"]
  ],
  doctor: {
    soapSaved: false,
    labOrdered: false,
    prescriptionSent: false,
    followUp: "",
    newHistoricalMedication: "",
    selectedQueueId: "q1",
    consultationQueueId: null,
    prescriptionDraft: null,
    prescriptionPendingConfirm: null,
    prescriptionLines: [
      { medication: "", dose: "", frequency: "", duration: "", instructions: "" }
    ],
    labDraft: null,
    labPendingConfirm: null,
    labLines: [
      { testName: "", priority: "Routine", specimen: "Blood", location: "Clinic treatment room", indication: "" }
    ],
    imagingDraft: null,
    imagingPendingConfirm: null,
    imagingLines: [
      { imagingType: "X-ray", bodyPart: "", priority: "Routine", transport: "Walk-in", indication: "" }
    ]
  },
  pharmacyQueue: [],
  nurseProcessQueue: [],
  patientHistory: [
    {
      id: "hist-lipid",
      date: "2026-05-16",
      type: "Lab Report",
      title: "Lipid Profile",
      detail: "LDL elevated, doctor reviewed.",
      completedBy: "Dr. Rahman",
      completedAction: "Reviewed lipid profile and marked report reviewed",
      doctorComment: "LDL remains above target. Continue statin, advise diet control, repeat fasting lipid in 3 months.",
      reportSummary: "Total cholesterol 6.1 mmol/L, LDL 4.2 mmol/L, HDL 1.1 mmol/L, triglycerides 1.9 mmol/L.",
      medicationAtTime: ["Atorvastatin 20 mg night", "Amlodipine 5 mg once daily"]
    },
    {
      id: "hist-admission",
      date: "2026-05-14",
      type: "Admission",
      title: "Ward B Bed 12",
      detail: "Discharged after observation.",
      completedBy: "Dr. Lim",
      completedAction: "Completed inpatient discharge and ward handover",
      doctorComment: "Chest pain resolved, serial ECG stable, troponin negative. Discharged with safety-net advice.",
      reportSummary: "Observation notes, nursing vitals chart, discharge summary, and medication reconciliation completed.",
      medicationAtTime: ["Aspirin 100 mg once daily for 7 days", "Pantoprazole 40 mg morning"]
    },
    {
      id: "hist-htn",
      date: "2026-04-21",
      type: "Consultation",
      title: "Hypertension follow-up",
      detail: "BP controlled, continue medication.",
      completedBy: "Dr. Ong",
      completedAction: "Completed outpatient consultation and renewed chronic medication",
      doctorComment: "Home BP acceptable. No dizziness or ankle swelling. Continue current antihypertensive plan.",
      reportSummary: "Clinic BP 128/78, pulse 76, no acute symptoms, medication adherence confirmed.",
      medicationAtTime: ["Amlodipine 5 mg once daily", "Metformin 500 mg twice daily"]
    },
    {
      id: "hist-xray",
      date: "2026-03-30",
      type: "Imaging",
      title: "Chest X-ray",
      detail: "No acute cardiopulmonary abnormality.",
      completedBy: "Dr. Devi",
      completedAction: "Reviewed imaging report and closed imaging task",
      doctorComment: "No consolidation or pulmonary congestion. Treat symptomatically and review if fever persists.",
      reportSummary: "Chest X-ray PA view: clear lung fields, normal cardiac silhouette, no pleural effusion.",
      medicationAtTime: ["Paracetamol 1 g when required", "Cetirizine 10 mg night for 5 days"]
    }
  ],
  historicalMedication: [
    { name: "Amlodipine", dose: "5 mg", frequency: "Once daily", source: "Patient reported", status: "Active" },
    { name: "Atorvastatin", dose: "20 mg", frequency: "Night", source: "Previous clinic", status: "Active" },
    { name: "Metformin", dose: "500 mg", frequency: "Twice daily", source: "External prescription", status: "Stopped" }
  ],
  clinic: {
    selectedQueue: "q1",
    queue: [
      { id: "q1", no: "Q-014", patient: "Rajan Kumar", mrn: "MRN-0088", age: 45, sex: "Male", reason: "Chest pain follow-up", doctor: "Dr. Rahman", status: "Waiting", reports: ["Lipid Profile"], called: false, transfer: "" },
      { id: "q2", no: "Q-015", patient: "Chen Mei", mrn: "MRN-11840", age: 34, sex: "Female", reason: "Post-lab review", doctor: "Dr. Ong", status: "Registered", reports: [], called: false, transfer: "" },
      { id: "q3", no: "Q-016", patient: "Nur Iman", mrn: "MRN-10018", age: 51, sex: "Female", reason: "Wound review", doctor: "Dr. Devi", status: "Vitals Done", reports: ["Discharge Summary"], called: false, transfer: "Ward review possible" }
    ]
  },
  nurseTasks: [
    { id: "t1", task: "IV antibiotic - Vancomycin 1g", patient: "Ali Hassan", bed: "B04", due: "Overdue 12m", control: "Patient scan required", status: "Pending", priority: "urgent" },
    { id: "t2", task: "Vital signs recording", patient: "Sara Lim", bed: "B09", due: "Due now", control: "NEWS2 auto score", status: "Pending", priority: "high" },
    { id: "t3", task: "Wound dressing change", patient: "Raj Kumar", bed: "B02", due: "28m", control: "Photo note optional", status: "Pending", priority: "normal" },
    { id: "t4", task: "Fluid chart update", patient: "Priya Nair", bed: "B11", due: "65m", control: "Intake/output validation", status: "Pending", priority: "normal" }
  ],
  vitals: { sbp: 120, dbp: 80, hr: 82, rr: 16, temp: 36.8, spo2: 98, gcs: 15 },
  patientChecks: [
    { time: "08:00", nurse: "Clinic Nurse Hana", bp: "128/78", glucose: "6.1 mmol/L", spo2: "98%", temp: "36.8 C", pulse: "82", note: "Hourly check stable" },
    { time: "09:00", nurse: "Clinic Nurse Hana", bp: "130/80", glucose: "6.4 mmol/L", spo2: "97%", temp: "36.9 C", pulse: "84", note: "No acute complaint" },
    { time: "10:00", nurse: "Clinic Nurse Hana", bp: "126/76", glucose: "6.2 mmol/L", spo2: "98%", temp: "36.7 C", pulse: "80", note: "Ready for doctor review" }
  ],
  handoverSaved: false,
  pediatric: {
    guardianConsent: false,
    weightKg: 21.4,
    temp: 39.1,
    vaccinationAck: false,
    doseChecked: false
  },
  icu: {
    spo2: 88,
    sbp: 92,
    dbp: 58,
    temp: 38.9,
    intake: 1280,
    output: 1700,
    ventilator: "VNT-009",
    transferRequested: false
  },
  selectedBedId: "ICU-03",
  beds: [
    { id: "P2-12", status: "Available", patient: "", detail: "Pediatric", flag: "Ready", admissionDate: "", lastCheck: "", diseases: [] },
    { id: "P2-14", status: "Occupied", patient: "Aisha Tan", mrn: "MRN-10294", detail: "Bronchopneumonia", flag: "Fever", admissionDate: "2026-05-17", lastCheck: "10:00", diseases: ["Bronchopneumonia", "Fever monitoring"] },
    { id: "ICU-03", status: "Occupied", patient: "Mr. K. Raman", mrn: "MRN-09331", detail: "Sepsis monitoring", flag: "Critical", admissionDate: "2026-05-15", lastCheck: "10:00", diseases: ["Sepsis", "Hypotension", "Low oxygen"] },
    { id: "ICU-04", status: "Maintenance", patient: "", detail: "Ventilator calibration", flag: "Blocked", admissionDate: "", lastCheck: "", diseases: [] },
    { id: "W1-08", status: "Pending Discharge", patient: "Nur Iman", mrn: "MRN-10018", detail: "Post-op care", flag: "Handover", admissionDate: "2026-05-16", lastCheck: "09:00", diseases: ["Post-operative care", "Medication due"] },
    { id: "W1-09", status: "Cleaning", patient: "", detail: "General Ward", flag: "ETA 20m", admissionDate: "", lastCheck: "", diseases: [] },
    { id: "C-Q04", status: "Reserved", patient: "Chen Mei", mrn: "MRN-11840", detail: "Follow-up review", flag: "Waiting", admissionDate: "2026-05-19", lastCheck: "08:00", diseases: ["Follow-up review"] },
    { id: "ISO-02", status: "Isolation", patient: "", detail: "General Ward", flag: "Isolation", admissionDate: "", lastCheck: "", diseases: [] }
  ],
  bedSetup: {
    hospital: "MediCore Private Hospital",
    building: "Main Block",
    floor: "Level 2",
    ward: "Ward B",
    room: "Room 12",
    bedPrefix: "B",
    rows: 2,
    cols: 4,
    bedStart: 1,
    selectedType: "General",
    map: [
      { id: "B01", room: "Room 12", ward: "Ward B", x: 1, y: 1, type: "General", status: "Available" },
      { id: "B02", room: "Room 12", ward: "Ward B", x: 2, y: 1, type: "General", status: "Occupied" },
      { id: "B03", room: "Room 12", ward: "Ward B", x: 3, y: 1, type: "Isolation", status: "Isolation" },
      { id: "B04", room: "Room 12", ward: "Ward B", x: 4, y: 1, type: "General", status: "Available" },
      { id: "B05", room: "Room 12", ward: "Ward B", x: 1, y: 2, type: "Pediatric", status: "Available" },
      { id: "B06", room: "Room 12", ward: "Ward B", x: 2, y: 2, type: "ICU", status: "Maintenance" },
      { id: "B07", room: "Room 12", ward: "Ward B", x: 3, y: 2, type: "General", status: "Available" },
      { id: "B08", room: "Room 12", ward: "Ward B", x: 4, y: 2, type: "General", status: "Cleaning" }
    ]
  },
  clinicAdmin: {
    users: [
      { id: "u-dr-rahman", role: "Doctor", name: "Dr. Rahman", username: "dr.rahman", password: "Rahman@123", room: "Consult 01", status: "Active" },
      { id: "u-dr-ong", role: "Doctor", name: "Dr. Ong", username: "dr.ong", password: "Ong@123", room: "Consult 02", status: "Active" },
      { id: "u-nurse-hana", role: "Clinic Nurse", name: "Nurse Hana", username: "nurse.hana", password: "Hana@123", room: "Treatment 01", status: "Active" }
    ],
    medicationFlow: {
      preparedBy: "Pharmacist Lee",
      signedOffBy: "Dr. Rahman",
      handoverToPatientBy: "Clinic Nurse Hana",
      doubleCheckRequired: true
    }
  },
  medication: [
    { id: "m1", name: "Amoxicillin", status: "Blocked", validation: "Penicillin allergy cross-reactivity" },
    { id: "m2", name: "Paracetamol", status: "Verify", validation: "Pediatric weight-based dose required" },
    { id: "m3", name: "Noradrenaline", status: "Double check", validation: "Controlled/high-risk ICU medication" },
    { id: "m4", name: "Ceftriaxone", status: "Ready", validation: "Batch CEF-2201, expires 2027-02" }
  ],
  inventory: [
    { item: "Normal saline 500ml", department: "ICU", qty: 8, status: "Low stock alert", supplier: "CareTech Medical", batch: "NS-2601", expiry: "2027-01-30", control: "General" },
    { item: "Paracetamol 500mg", department: "Pharmacy", qty: 220, status: "Ready", supplier: "MediPharm Sdn Bhd", batch: "PCM-5521", expiry: "2027-09-15", control: "General" },
    { item: "Morphine 10mg/ml", department: "Pharmacy", qty: 12, status: "Controlled drug", supplier: "SecureMeds", batch: "MOR-1190", expiry: "2026-12-20", control: "Controlled" },
    { item: "Ceftriaxone 1g", department: "Pharmacy", qty: 32, status: "Expiry tracked", supplier: "BioAntibiotic Supply", batch: "CEF-2201", expiry: "2027-02-10", control: "Antibiotic" }
  ],
  assetStores: ["Store Room 1", "Store Room 2", "ICU Ward", "Pediatric Ward", "Nurse Ward"],
  assets: [
    { id: "a1", name: "Ventilator VNT-009", assignment: "ICU-03", status: "Assigned to patient", purchaseDate: "2023-08-12", supplier: "MedEquip Sdn Bhd", cost: "RM 86,000" },
    { id: "a2", name: "Infusion Pump P-144", assignment: "ICU-03", status: "Calibration valid", purchaseDate: "2024-02-18", supplier: "CareTech Medical", cost: "RM 12,800" },
    { id: "a3", name: "Monitor MON-022", assignment: "Maintenance", status: "Cannot assign", purchaseDate: "2022-11-04", supplier: "VitalSense Healthcare", cost: "RM 24,500" },
    { id: "a4", name: "Portable X-ray XR-02", assignment: "Pediatric", status: "Biomedical tracked", purchaseDate: "2021-06-30", supplier: "ImagingPro Asia", cost: "RM 145,000" }
  ],
  reports: [
    { id: "r1", name: "chest-xray.pdf", link: "MRN-10294 / ENC-7781", status: "Doctor review pending" },
    { id: "r2", name: "lab-sepsis-panel.pdf", link: "MRN-09331 / ENC-7740", status: "Abnormal result alert" },
    { id: "r3", name: "referral-letter.docx", link: "MRN-11840 / ENC-7788", status: "Version 2" },
    { id: "r4", name: "discharge-summary.pdf", link: "MRN-10018 / ENC-7711", status: "Reviewed" }
  ]
};

function addAudit(action, user, target, result) {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  state.auditRows.unshift([time, action, user, target, result]);
}

function notify(message) {
  state.toast = message;
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => {
    state.toast = "";
    render();
  }, 2800);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function badge(value) {
  const cls = String(value).toLowerCase().replace(/\s+/g, "-");
  return `<span class="badge ${cls}">${escapeHtml(value)}</span>`;
}

function metric(label, value, tone) {
  return `<div class="metric ${tone}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function sectionHeader(title, subtitle, action = "") {
  return `
    <div class="section-header">
      <div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(subtitle)}</p>
      </div>
      ${action}
    </div>
  `;
}

function dataTable(headers, rows) {
  return `
    <div class="data-table" style="--cols:${headers.length}">
      <div class="table-row table-head">${headers.map((h) => `<strong>${escapeHtml(h)}</strong>`).join("")}</div>
      ${rows.map((row) => `<div class="table-row">${row.map((c) => `<span>${c}</span>`).join("")}</div>`).join("")}
    </div>
  `;
}

function downloadTextFile(filename, content, mimeType = "text/csv") {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function nurseChecksCsv() {
  const headers = ["Time", "Nurse", "Blood Pressure", "Glucose", "SpO2", "Temperature", "Pulse", "Note"];
  const rows = state.patientChecks.map((check) => [check.time, check.nurse, check.bp, check.glucose, check.spo2, check.temp, check.pulse, check.note]);
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function nurseChecksExcelHtml() {
  const headers = ["Time", "Nurse", "Blood Pressure", "Glucose", "SpO2", "Temperature", "Pulse", "Note"];
  const rows = state.patientChecks.map((check) => [check.time, check.nurse, check.bp, check.glucose, check.spo2, check.temp, check.pulse, check.note]);
  return `
    <html>
      <head><meta charset="utf-8"></head>
      <body>
        <table border="1">
          <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
          <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
      </body>
    </html>
  `;
}

function nurseChecksPdfHtml() {
  const p = state.selectedPatient;
  return `
    <html>
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(p.mrn)} Nurse Check Report</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; padding: 28px; }
          h1 { margin: 0 0 6px; font-size: 22px; }
          p { margin: 0 0 18px; color: #374151; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
          th { background: #e5f7ed; }
        </style>
      </head>
      <body>
        <h1>Nurse Check Report</h1>
        <p>${escapeHtml(p.name)} / ${escapeHtml(p.mrn)} / ${escapeHtml(p.department)}</p>
        ${nurseChecksExcelHtml().match(/<table[\s\S]*<\/table>/)?.[0] || ""}
      </body>
    </html>
  `;
}

function dataDownloadHref(content, mimeType) {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
}

function daysCount(admissionDate) {
  if (!admissionDate) return 0;
  const start = new Date(`${admissionDate}T00:00:00`);
  const today = new Date();
  return Math.max(1, Math.floor((today - start) / 86400000) + 1);
}

function bedPatient(bed) {
  return patients.find((patient) => patient.mrn === bed.mrn || patient.name === bed.patient) || null;
}

function prescriptionQueueRows() {
  if (state.pharmacyQueue.length) {
    return state.pharmacyQueue.map((queue, index) => ({
      id: `live-${index}`,
      source: queue.source || "Clinic",
      queueNo: queue.queueNo,
      patient: queue.patient,
      medication: queue.medication || queue.items?.map((item) => item.medication).filter(Boolean).join("; ") || "Prescription items",
      status: queue.status || "Ready to call"
    }));
  }

  return [
    { id: "rx-clinic-014", source: "Clinic", queueNo: "Q-014", patient: "Rajan Kumar", medication: "Amlodipine 5mg; Atorvastatin 20mg", status: "Ready to call" },
    { id: "rx-icu-03", source: "ICU", queueNo: "ICU-03", patient: "Mr. K. Raman", medication: "Noradrenaline infusion; Ceftriaxone 1g", status: "Urgent verification" },
    { id: "rx-ward-08", source: "Ward", queueNo: "W1-08", patient: "Nur Iman", medication: "Paracetamol 500mg", status: "Waiting pickup" }
  ];
}

function selectedPharmacyStockIndex() {
  const fromSelect = Number(document.getElementById("pharmacyStockSelect")?.value);
  return Number.isFinite(fromSelect) ? fromSelect : 0;
}

function commandView() {
  const pendingTasks = state.nurseTasks.filter((t) => t.status !== "Completed").length;
  const criticalAlerts = [
    state.icu.spo2 < 92,
    state.icu.temp > 38.5,
    state.pediatric.temp > 38,
    state.medication.some((m) => ["Blocked", "Double check"].includes(m.status))
  ].filter(Boolean).length;
  const occupiedBeds = state.beds.filter((b) => b.status === "Occupied" || b.status === "Pending Discharge").length;

  return `
    <div class="metric-grid">
      ${metric("Beds occupied", `${occupiedBeds} / ${state.beds.length}`, "blue")}
      ${metric("Critical alerts", criticalAlerts, "red")}
      ${metric("Medication checks", state.medication.length + state.pharmacyQueue.length + 14, "amber")}
      ${metric("Audit events", state.auditRows.length.toLocaleString(), "green")}
    </div>
    ${sectionHeader("Live Department Harness", "Shared patient record, shared access control, shared audit trail.", `<button class="primary-button" data-action="open-modal" data-modal="command">Open analytics</button>`)}
    <div class="flow-map">
      ${["Core Data", "Access Control", "Patient Workflow", "Doctor Clinic", "Doctor Ward", "Nurse Ward", "Pediatric", "ICU", "Medication", "Inventory", "Assets", "Audit", "AI Assist"]
        .map((item, index) => `<button class="flow-node ${index < 3 ? "locked" : ""}" data-action="flow" data-target="${moduleToView(item)}"><span>${String(index + 1).padStart(2, "0")}</span><strong>${item}</strong></button>`)
        .join("")}
    </div>
    <div class="two-col">
      <section class="panel-card compact">
        <div class="panel-title"><span class="panel-icon">AL</span><h2>Alert Feed</h2></div>
        ${alertLine("Critical oxygen", `ICU-03 - SpO2 ${state.icu.spo2}%`, "icu")}
        ${alertLine("Pediatric fever", `P2-14 - Temp ${state.pediatric.temp} C`, "pediatric")}
        ${alertLine("Medication blocked", state.medication.find((m) => m.status === "Blocked")?.validation || "No blocked medicine", "medication")}
        ${alertLine("Calibration due", state.assets.find((a) => a.assignment === "Maintenance")?.name || "No asset issue", "assets")}
      </section>
      <section class="panel-card compact">
        <div class="panel-title"><span class="panel-icon">KP</span><h2>Department Load</h2></div>
        ${loadRow("Doctor Clinic", `${filteredPatients().length} queued`, 54)}
        ${loadRow("Nurse Ward", `${pendingTasks} tasks`, Math.min(92, pendingTasks * 20))}
        ${loadRow("Pediatric Ward", state.pediatric.guardianConsent ? "consent signed" : "consent pending", state.pediatric.guardianConsent ? 35 : 72)}
        ${loadRow("ICU Ward", state.icu.transferRequested ? "transfer requested" : `${criticalAlerts} alerts`, 88)}
      </section>
    </div>
  `;
}

function moduleToView(name) {
  return {
    "Doctor Clinic": "doctor",
    "Doctor Ward": "doctorWard",
    "Nurse Ward": "nurse",
    Pediatric: "pediatric",
    ICU: "icu",
    Medication: "medication",
    Inventory: "inventory",
    Assets: "assets",
    Audit: "audit"
  }[name] || "command";
}

function alertLine(title, detail, target) {
  return `<button class="alert-line action-line" data-action="open-view" data-target="${target}"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></button>`;
}

function loadRow(label, value, pct) {
  return `<div class="load-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div><div class="load-bar"><span style="width:${pct}%"></span></div>`;
}

function patientActivityTimeline() {
  return state.patientHistory.map((item) => `
    <button class="history-card history-button" data-action="open-history-activity" data-id="${escapeHtml(item.id || item.title)}">
      <strong>${escapeHtml(item.type)}: ${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.date)} - ${escapeHtml(item.detail)}</span>
      <small>${escapeHtml(item.completedBy || "Clinical team")} - ${escapeHtml(item.completedAction || "Clinical activity completed")}</small>
    </button>
  `).join("");
}

function currentOrderContext() {
  if (state.view === "doctorWard") {
    return {
      id: state.selectedPatient.mrn,
      no: state.selectedPatient.bed,
      patient: state.selectedPatient.name,
      mrn: state.selectedPatient.mrn,
      age: state.selectedPatient.age,
      sex: "",
      doctor: state.selectedPatient.doctor,
      reports: []
    };
  }
  return state.clinic.queue.find((q) => q.called) || state.clinic.queue[0];
}

function doctorView() {
  const selectedQueue = state.clinic.queue.find((q) => q.id === state.doctor.selectedQueueId) || state.clinic.queue[0];
  const consultationQueue = state.clinic.queue.find((q) => q.id === state.doctor.consultationQueueId);
  if (!consultationQueue) {
    return `
      <div class="doctor-queue-screen">
        <section class="doctor-consult-card">
          <div class="doctor-card-head">
            <div>
              <h2>Clinic Queue</h2>
              <p class="muted-copy">Review patient history before calling the patient into consultation.</p>
            </div>
            ${badge(`${state.clinic.queue.length} waiting`)}
          </div>
          <div class="doctor-queue-table">
            ${state.clinic.queue.map((q) => `
              <button class="doctor-queue-row ${q.id === selectedQueue.id ? "selected" : ""}" data-action="doctor-select-queue" data-id="${q.id}">
                <strong>${escapeHtml(q.no)}</strong>
                <span>${escapeHtml(q.patient)}</span>
                <span>${escapeHtml(q.reason)}</span>
                ${badge(q.status)}
              </button>
            `).join("")}
          </div>
        </section>

        <aside class="doctor-side-card">
          <h2>Review Before Call</h2>
          <div class="doctor-patient-band compact-band">
            <strong>${escapeHtml(selectedQueue.patient)}</strong>
            <span>${escapeHtml(selectedQueue.mrn)} • ${escapeHtml(selectedQueue.age)}Y • ${escapeHtml(selectedQueue.sex)} • ${escapeHtml(selectedQueue.no)}</span>
          </div>

          <h2>Patient Medical Activities</h2>
          <div class="history-timeline">
            ${patientActivityTimeline()}
          </div>

          <h2 class="orders-title">Historical Medication</h2>
          <div class="historical-med-list">
            ${state.historicalMedication.map((med) => `
              <div>
                <strong>${escapeHtml(med.name)} ${escapeHtml(med.dose)}</strong>
                <span>${escapeHtml(med.frequency)} - ${escapeHtml(med.source)} - ${escapeHtml(med.status)}</span>
              </div>
            `).join("")}
          </div>

          <button class="primary-button call-patient-button" data-action="doctor-call-selected">Call ${escapeHtml(selectedQueue.patient)}</button>
        </aside>
      </div>
    `;
  }
  const p = state.selectedPatient;
  const nextQueue = consultationQueue;
  return `
    <div class="doctor-workspace">
      <section class="doctor-consult-card">
        <div class="doctor-card-head">
          <h2>Patient Consultation</h2>
          <span class="allergy-pill">Penicillin Allergy</span>
        </div>
        <div class="doctor-patient-band">
          <strong>${escapeHtml(nextQueue.patient)}</strong>
          <span>${escapeHtml(nextQueue.mrn)} • ${escapeHtml(nextQueue.age)}Y • ${escapeHtml(nextQueue.sex)} • ${escapeHtml(nextQueue.no)}</span>
        </div>
        <label class="doctor-field">Subjective (History / Complaints)
          <textarea id="soapS" placeholder="Enter patient history and symptoms...">Fever, cough, reduced appetite, follow-up complaint captured.</textarea>
        </label>
        <label class="doctor-field">Objective (Physical Findings)
          <textarea id="soapO" placeholder="Enter examination findings...">${escapeHtml(p.vitals)}; report upload status visible.</textarea>
        </label>
        <label class="doctor-field">Assessment (Diagnosis / ICD-10)
          <input id="soapA" placeholder="Diagnosis code or description..." value="${escapeHtml(p.diagnosis)}">
        </label>
        <label class="doctor-field">Plan (Treatment / Prescriptions)
          <textarea id="soapP" placeholder="Enter treatment plan...">Lab/imaging order, prescription validation, follow-up scheduling, audit write.</textarea>
        </label>
        <section class="doctor-attachment-box">
          <div>
            <h3>Patient Provided Medical Report</h3>
            <p>Attach PDF/image/report to this patient encounter for doctor review.</p>
          </div>
          <div class="doctor-attachment-grid">
            <label>Report name<input id="doctorReportName" placeholder="e.g. outside-lab-report.pdf"></label>
            <label>Report type<select id="doctorReportType"><option>Lab report</option><option>Imaging report</option><option>Referral letter</option><option>Discharge summary</option><option>Other medical report</option></select></label>
            <label class="attachment-file">Attachment<input id="doctorReportFile" type="file" accept=".pdf,image/*"></label>
          </div>
          <button class="secondary-button" data-action="doctor-upload-report">Upload patient report</button>
        </section>
        <div class="doctor-actions">
          <button class="primary-button" data-action="save-soap">Save Consultation</button>
          <button class="secondary-button" data-action="open-modal" data-modal="doctor">Open Modal</button>
        </div>
      </section>

      <aside class="doctor-side-card">
        <h2>Clinic Queue</h2>
        <div class="doctor-queue-mini">
          ${state.clinic.queue.map((q) => `<button class="${q.id === state.doctor.consultationQueueId ? "called" : ""}" data-action="doctor-select-queue" data-id="${q.id}"><b>${escapeHtml(q.no)}</b><span>${escapeHtml(q.patient)} - ${escapeHtml(q.status)}</span></button>`).join("")}
        </div>

        <h2>Patient Medical Activities</h2>
        <div class="history-timeline">
          ${patientActivityTimeline()}
        </div>

        <h2 class="orders-title">Historical Medication</h2>
        <div class="historical-med-list">
          ${state.historicalMedication.map((med) => `
            <div>
              <strong>${escapeHtml(med.name)} ${escapeHtml(med.dose)}</strong>
              <span>${escapeHtml(med.frequency)} - ${escapeHtml(med.source)} - ${escapeHtml(med.status)}</span>
            </div>
          `).join("")}
        </div>
        <div class="historical-med-entry">
          <input id="historicalMedicationInput" placeholder="Key in medication taken before, e.g. Aspirin 100mg daily">
          <button class="secondary-button" data-action="add-historical-med">Add history med</button>
        </div>

        <h2 class="orders-title">Orders</h2>
        <button class="order-button" data-action="send-prescription">New Prescription</button>
        <button class="order-button" data-action="order-lab">Lab Request</button>
        <button class="order-button" data-action="order-imaging">Imaging Request</button>
        <h2 class="orders-title">Pharmacy Collection Queue</h2>
        <div class="pharmacy-queue">
          ${state.pharmacyQueue.length ? state.pharmacyQueue.map((item) => `
            <div>
              <strong>${escapeHtml(item.queueNo)} · ${escapeHtml(item.patient)}</strong>
              <span>${escapeHtml(item.medication)} · ${escapeHtml(item.status)}</span>
            </div>
          `).join("") : `<div><strong>No pharmacy queue yet</strong><span>Prescription appears here after doctor confirms send.</span></div>`}
        </div>
        <h2 class="orders-title">Nurse Process Queue</h2>
        <div class="pharmacy-queue">
          ${state.nurseProcessQueue.length ? state.nurseProcessQueue.map((item) => `
            <div>
              <strong>${escapeHtml(item.queueNo)} · ${escapeHtml(item.patient)}</strong>
              <span>${escapeHtml(item.testName || item.imagingType)} · ${escapeHtml(item.status)}</span>
            </div>
          `).join("") : `<div><strong>No nurse process queue yet</strong><span>Lab request appears here after doctor confirms send.</span></div>`}
        </div>
      </aside>
    </div>
    ${state.doctor.soapSaved ? `<div class="success-note">SOAP note saved and audit trail updated.</div>` : ""}
  `;
}

function doctorWardView() {
  const p = state.selectedPatient;
  const wardPatients = patients.filter((patient) => patient.department.includes("Ward") || patient.bed.includes("ICU") || patient.bed.startsWith("W"));
  return `
    <div class="doctor-workspace">
      <section class="doctor-consult-card">
        <div class="doctor-card-head">
          <div>
            <h2>Ward Patient Review</h2>
            <p class="muted-copy">Doctor reviews admitted patients directly. No queue calling required.</p>
          </div>
          ${badge(p.status)}
        </div>
        <div class="doctor-patient-band">
          <strong>${escapeHtml(p.name)}</strong>
          <span>${escapeHtml(p.mrn)} &bull; ${escapeHtml(p.age)}Y &bull; ${escapeHtml(p.department)} &bull; ${escapeHtml(p.bed)}</span>
        </div>
        <label class="doctor-field">Subjective (Ward Round / Complaints)
          <textarea id="soapS" placeholder="Enter ward round history...">${escapeHtml(p.note)}</textarea>
        </label>
        <label class="doctor-field">Objective (Vitals / Physical Findings)
          <textarea id="soapO" placeholder="Enter examination findings...">${escapeHtml(p.vitals)}; nurse observations and reports available in patient card.</textarea>
        </label>
        <label class="doctor-field">Assessment (Diagnosis / ICD-10)
          <input id="soapA" placeholder="Diagnosis code or description..." value="${escapeHtml(p.diagnosis)}">
        </label>
        <label class="doctor-field">Plan (Treatment / Prescriptions)
          <textarea id="soapP" placeholder="Enter treatment plan...">Ward round plan, medication review, lab/imaging order, discharge or transfer decision.</textarea>
        </label>
        <section class="doctor-attachment-box">
          <div>
            <h3>Patient Provided Medical Report</h3>
            <p>Attach PDF/image/report to this ward encounter for doctor review.</p>
          </div>
          <div class="doctor-attachment-grid">
            <label>Report name<input id="doctorReportName" placeholder="e.g. outside-lab-report.pdf"></label>
            <label>Report type<select id="doctorReportType"><option>Lab report</option><option>Imaging report</option><option>Referral letter</option><option>Discharge summary</option><option>Other medical report</option></select></label>
            <label class="attachment-file">Attachment<input id="doctorReportFile" type="file" accept=".pdf,image/*"></label>
          </div>
          <button class="secondary-button" data-action="doctor-upload-report">Upload patient report</button>
        </section>
        <div class="doctor-actions">
          <button class="primary-button" data-action="save-soap">Save Ward Review</button>
          <button class="secondary-button" data-action="open-modal" data-modal="doctor">Open Modal</button>
        </div>
      </section>

      <aside class="doctor-side-card">
        <h2>Ward Patient List</h2>
        <div class="doctor-queue-mini">
          ${wardPatients.map((patient) => `<button class="${patient.mrn === p.mrn ? "called" : ""}" data-patient="${patient.mrn}"><b>${escapeHtml(patient.bed)}</b><span>${escapeHtml(patient.name)} - ${escapeHtml(patient.status)}</span></button>`).join("")}
        </div>

        <h2>Patient Medical Activities</h2>
        <div class="history-timeline">
          ${patientActivityTimeline()}
        </div>

        <h2 class="orders-title">Historical Medication</h2>
        <div class="historical-med-list">
          ${state.historicalMedication.map((med) => `
            <div>
              <strong>${escapeHtml(med.name)} ${escapeHtml(med.dose)}</strong>
              <span>${escapeHtml(med.frequency)} - ${escapeHtml(med.source)} - ${escapeHtml(med.status)}</span>
            </div>
          `).join("")}
        </div>
        <div class="historical-med-entry">
          <input id="historicalMedicationInput" placeholder="Key in medication taken before, e.g. Aspirin 100mg daily">
          <button class="secondary-button" data-action="add-historical-med">Add history med</button>
        </div>

        <h2 class="orders-title">Ward Orders</h2>
        <button class="order-button" data-action="send-prescription">New Prescription</button>
        <button class="order-button" data-action="order-lab">Lab Request</button>
        <button class="order-button" data-action="order-imaging">Imaging Request</button>
      </aside>
    </div>
    ${state.doctor.soapSaved ? `<div class="success-note">Ward review saved and audit trail updated.</div>` : ""}
  `;
}

function clinicNurseView() {
  const selected = state.clinic.queue.find((q) => q.id === state.clinic.selectedQueue) || state.clinic.queue[0];
  return `
    <div class="clinic-grid">
      <section class="clinic-panel">
        <div class="clinic-head">
          <div>
            <h2>Clinic Queue</h2>
            <p>Register patient, take vitals, attach reports, and call doctor.</p>
          </div>
          <button class="primary-button" data-action="register-clinic-patient">Register walk-in</button>
        </div>
        <div class="clinic-queue-list">
          ${state.clinic.queue.map((q) => `
            <button class="clinic-queue-row ${q.id === selected.id ? "selected" : ""}" data-action="select-clinic-queue" data-id="${q.id}">
              <strong>${escapeHtml(q.no)} · ${escapeHtml(q.patient)}</strong>
              <span>${escapeHtml(q.mrn)} · ${escapeHtml(q.reason)}</span>
              ${badge(q.status)}
            </button>
          `).join("")}
        </div>
      </section>

      <section class="clinic-panel">
        <div class="clinic-head">
          <div>
            <h2>Patient Registration</h2>
            <p>Common clinic-front details before doctor consultation.</p>
          </div>
          ${badge(selected.status)}
        </div>
        <div class="registration-card">
          <label>Patient name<input id="clinicPatientName" value="${escapeHtml(selected.patient)}"></label>
          <label>MRN<input value="${escapeHtml(selected.mrn)}" disabled></label>
          <label>Visit reason<input id="clinicReason" value="${escapeHtml(selected.reason)}"></label>
          <label>Assigned doctor<select id="clinicDoctor"><option ${selected.doctor === "Dr. Rahman" ? "selected" : ""}>Dr. Rahman</option><option ${selected.doctor === "Dr. Ong" ? "selected" : ""}>Dr. Ong</option><option ${selected.doctor === "Dr. Devi" ? "selected" : ""}>Dr. Devi</option></select></label>
        </div>
        <div class="clinic-action-row">
          <button class="secondary-button" data-action="save-registration">Save registration</button>
          <button class="secondary-button" data-action="take-clinic-vitals">Take vitals</button>
          <button class="primary-button" data-action="call-doctor">Call doctor</button>
        </div>
      </section>

      <section class="clinic-panel">
        <div class="clinic-head">
          <div>
            <h2>Attached Medical Reports</h2>
            <p>Nurse can attach outside reports before doctor review.</p>
          </div>
          <button class="primary-button" data-action="attach-clinic-report">Attach report</button>
        </div>
        <div class="report-stack">
          ${(selected.reports.length ? selected.reports : ["No reports attached"]).map((report) => `<div><strong>${escapeHtml(report)}</strong><span>${selected.reports.length ? "Linked to clinic visit" : "Attach PDF/image/report"}</span></div>`).join("")}
        </div>
      </section>

      <section class="clinic-panel">
        <div class="clinic-head">
          <div>
            <h2>Transfer To Ward</h2>
            <p>Escalate from clinic to ward when admission or observation is needed.</p>
          </div>
        </div>
        <div class="transfer-box">
          <label>Target ward<select id="targetWard"><option>General Ward</option><option>Pediatric Ward</option><option>ICU Ward</option><option>Isolation Room</option></select></label>
          <label>Transfer reason<input id="transferReason" value="${escapeHtml(selected.transfer || "Observation required")}"></label>
          <button class="danger-button" data-action="transfer-to-ward">Transfer patient to ward</button>
        </div>
      </section>
    </div>
  `;
}

function nurseView() {
  const pending = state.nurseTasks.filter((t) => t.status !== "Completed");
  const done = state.nurseTasks.filter((t) => t.status === "Completed");
  const score = scoreNews2(state.vitals);
  const level = ewsLevel(score);
  return `
    ${sectionHeader("Ward Task List", "Complete tasks, record vitals, calculate NEWS2, and save handover.", `<button class="primary-button" data-action="open-modal" data-modal="handover">Handover modal</button>`)}
    <div class="metric-grid three">
      ${metric("My patients", "8", "blue")}
      ${metric("Pending tasks", pending.length, "amber")}
      ${metric("Completed today", done.length, "green")}
    </div>
    ${dataTable(["Task", "Patient", "Bed", "Due", "Action"], state.nurseTasks.map((task) => [
      escapeHtml(task.task),
      escapeHtml(task.patient),
      escapeHtml(task.bed),
      escapeHtml(task.status === "Completed" ? "Done" : task.due),
      task.status === "Completed"
        ? `<span class="done-label">Completed</span>`
        : `<button class="table-button" data-action="complete-task" data-id="${task.id}">Complete</button>`
    ]))}
    <section class="ews-card">
      <div>
        <h3>NEWS2 Live Calculator</h3>
        <div class="form-grid compact-form">
          ${numberInput("sbp", "SBP", state.vitals.sbp)}
          ${numberInput("dbp", "DBP", state.vitals.dbp)}
          ${numberInput("hr", "HR", state.vitals.hr)}
          ${numberInput("rr", "RR", state.vitals.rr)}
          ${numberInput("temp", "Temp", state.vitals.temp, "0.1")}
          ${numberInput("spo2", "SpO2", state.vitals.spo2)}
          ${numberInput("gcs", "GCS", state.vitals.gcs)}
        </div>
      </div>
      <div class="ews-score ${level.tone}">
        <strong>${score}</strong>
        <span>${level.label}</span>
      </div>
      <button class="primary-button" data-action="save-vitals">Save vitals</button>
    </section>
    <section class="ews-card nurse-entry-card">
      <div>
        <h3>Hourly Nurse Check Entry</h3>
        <div class="form-grid compact-form">
          <label>Time <input id="nurseCheckTime" type="time" value="${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}"></label>
          <label>Blood pressure <input id="nurseCheckBp" value="${state.vitals.sbp}/${state.vitals.dbp}"></label>
          <label>Glucose <input id="nurseCheckGlucose" value="6.2 mmol/L"></label>
          <label>SpO2 <input id="nurseCheckSpo2" value="${state.vitals.spo2}%"></label>
          <label>Temperature <input id="nurseCheckTemp" value="${state.vitals.temp} C"></label>
          <label>Pulse <input id="nurseCheckPulse" value="${state.vitals.hr}"></label>
        </div>
        <label class="nurse-note-entry">Nurse note <textarea id="nurseCheckNote">Hourly ward check recorded.</textarea></label>
      </div>
      <button class="primary-button" data-action="save-nurse-check">Save nurse check</button>
    </section>
    ${state.handoverSaved ? `<div class="success-note">Shift handover saved with ${pending.length} pending task(s).</div>` : ""}
  `;
}

function numberInput(key, label, value, step = "1") {
  return `<label>${label}<input type="number" step="${step}" data-vital="${key}" value="${escapeHtml(value)}"></label>`;
}

function scoreNews2(v) {
  let s = 0;
  if (v.rr <= 8) s += 3; else if (v.rr <= 11) s += 1; else if (v.rr <= 20) s += 0; else if (v.rr <= 24) s += 2; else s += 3;
  if (v.spo2 <= 91) s += 3; else if (v.spo2 <= 93) s += 2; else if (v.spo2 <= 95) s += 1;
  if (v.sbp <= 90) s += 3; else if (v.sbp <= 100) s += 2; else if (v.sbp <= 110) s += 1; else if (v.sbp >= 220) s += 3;
  if (v.hr <= 40) s += 3; else if (v.hr <= 50) s += 1; else if (v.hr <= 90) s += 0; else if (v.hr <= 110) s += 1; else if (v.hr <= 130) s += 2; else s += 3;
  if (v.temp < 35) s += 3; else if (v.temp < 36) s += 1; else if (v.temp <= 38) s += 0; else if (v.temp <= 39) s += 1; else s += 2;
  if (v.gcs < 15) s += 3;
  return s;
}

function ewsLevel(score) {
  if (score >= 7) return { label: "RED - emergency response", tone: "danger" };
  if (score >= 5) return { label: "AMBER - doctor review", tone: "warning" };
  return { label: "GREEN - routine monitoring", tone: "safe" };
}

function saveNurseCheckFromFields(prefix = "") {
  const get = (id, fallback = "") => document.getElementById(`${prefix}${id}`)?.value?.trim() || fallback;
  const check = {
    time: get("NurseCheckTime", new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })),
    nurse: "Nurse Ward",
    bp: get("NurseCheckBp", `${state.vitals.sbp}/${state.vitals.dbp}`),
    glucose: get("NurseCheckGlucose", "Not recorded"),
    spo2: get("NurseCheckSpo2", `${state.vitals.spo2}%`),
    temp: get("NurseCheckTemp", `${state.vitals.temp} C`),
    pulse: get("NurseCheckPulse", String(state.vitals.hr)),
    note: get("NurseCheckNote", "Hourly nurse check recorded")
  };
  state.patientChecks.push(check);
  addAudit("nurse.check.recorded", "Nurse Ward", state.selectedPatient.mrn, `BP ${check.bp}, glucose ${check.glucose}, SpO2 ${check.spo2}`);
  notify(`Nurse check saved at ${check.time}.`);
}

function pediatricView() {
  const p = state.pediatric;
  const dose = Math.round(p.weightKg * 15);
  return `
    ${sectionHeader("Child Patient Safety", "Guardian consent, age-based vitals, growth, vaccination, feeding, and weight-based dosage.", `<button class="primary-button" data-action="open-modal" data-modal="consent">${p.guardianConsent ? "Review consent" : "Consent modal"}</button>`)}
    <div class="rule-grid">
      ${ruleCard("Guardian", p.guardianConsent ? "Consent signed by guardian" : "Procedure consent pending", p.guardianConsent ? "green" : "amber")}
      ${ruleCard("Weight", `${p.weightKg} kg - dose cap enabled`, "blue")}
      ${ruleCard("Fever", `${p.temp} C - ${p.temp > 38 ? "alert active" : "normal"}`, p.temp > 38 ? "red" : "green")}
      ${ruleCard("Vaccination", p.vaccinationAck ? "Parent notified" : "Due alert in 12 days", p.vaccinationAck ? "green" : "amber")}
    </div>
    <section class="panel-card compact">
      <div class="panel-title"><span class="panel-icon">DG</span><h2>Pediatric Medication Rules</h2></div>
      <div class="form-grid">
        <label>Weight kg <input type="number" step="0.1" id="pediatricWeight" value="${p.weightKg}"></label>
        <label>Temperature C <input type="number" step="0.1" id="pediatricTemp" value="${p.temp}"></label>
      </div>
      ${dataTable(["Check", "Result", "Action"], [
        ["Age", "7 years", "Use pediatric range"],
        ["Weight", `${p.weightKg} kg`, `Calculated dose ${dose} mg`],
        ["Allergy", "Penicillin", "Block amoxicillin"],
        ["Duplicate", "None active", "Allow if dose safe"],
        ["Maximum dose", p.doseChecked ? "Checked and within cap" : "Awaiting check", "Send to pharmacy verification"]
      ])}
      <div class="action-strip">
        <button class="secondary-button" data-action="check-dose">Run dose check</button>
        <button class="secondary-button" data-action="ack-vaccine">Acknowledge vaccination alert</button>
      </div>
    </section>
  `;
}

function icuView() {
  const icu = state.icu;
  const fluid = icu.intake - icu.output;
  return `
    ${sectionHeader("Critical Patient Monitor", "Record observations, update ventilator, calculate fluid balance, and request transfer approval.", `<button class="danger-button" data-action="open-modal" data-modal="icu-alert">Escalation modal</button>`)}
    <div class="icu-grid">
      ${vital("SpO2", `${icu.spo2}%`, "Low oxygen alert", icu.spo2 < 92 ? "danger" : "")}
      ${vital("BP", `${icu.sbp}/${icu.dbp}`, "Abnormal pressure", icu.sbp < 100 ? "danger" : "")}
      ${vital("Temp", `${icu.temp} C`, "High fever", icu.temp > 38.5 ? "warning" : "")}
      ${vital("Fluid", `${fluid} ml`, "Intake minus output", fluid < 0 ? "warning" : "")}
      ${vital("Ventilator", icu.ventilator, "Linked asset ID", "")}
      ${vital("Transfer", icu.transferRequested ? "Requested" : "Not requested", "Doctor approval required", icu.transferRequested ? "warning" : "")}
    </div>
    <section class="panel-card compact">
      <div class="form-grid">
        <label>SpO2 <input type="number" id="icuSpo2" value="${icu.spo2}"></label>
        <label>SBP <input type="number" id="icuSbp" value="${icu.sbp}"></label>
        <label>DBP <input type="number" id="icuDbp" value="${icu.dbp}"></label>
        <label>Temp <input type="number" step="0.1" id="icuTemp" value="${icu.temp}"></label>
        <label>Intake ml <input type="number" id="icuIntake" value="${icu.intake}"></label>
        <label>Output ml <input type="number" id="icuOutput" value="${icu.output}"></label>
      </div>
      <div class="action-strip">
        <button class="secondary-button" data-action="save-icu">Save hourly observation</button>
        <button class="secondary-button" data-action="request-transfer">Request transfer approval</button>
      </div>
    </section>
    <div class="timeline">
      ${state.auditRows.filter((r) => r[3] === "ICU-03" || r[3] === "MRN-09331").slice(0, 4).map((row) => `<div class="timeline-item"><span></span>${escapeHtml(row[0])} ${escapeHtml(row[1])} - ${escapeHtml(row[4])}</div>`).join("")}
    </div>
  `;
}

function bedView() {
  const setupBeds = state.bedSetup.map.map((bed) => ({
    id: bed.id,
    status: bed.status,
    patient: bed.status === "Occupied" ? "Assigned Patient" : "",
    detail: `${bed.ward} / ${bed.room} / ${bed.type}`,
    flag: bed.type,
    admissionDate: bed.status === "Occupied" ? "2026-05-19" : "",
    lastCheck: bed.status === "Occupied" ? "10:00" : "",
    diseases: [bed.type]
  }));
  const beds = [...state.beds, ...setupBeds];
  return `
    ${sectionHeader("Ward, Room and Bed Layout", "Click a bed to check patient situation, check in/out, observations, disease data, and medication history.", `<button class="primary-button" data-action="open-view" data-target="adminSetup">Open Admin Setup</button>`)}
    <div class="bed-grid">
      ${beds.map((bed) => `
        <button class="bed-card ${bed.status.toLowerCase().replace(/\s+/g, "-")}" data-action="open-bed-detail" data-id="${bed.id}">
          <div class="bed-top"><strong>${escapeHtml(bed.id)}</strong><span>${escapeHtml(bed.status)}</span></div>
          <p>${escapeHtml(bed.patient || "No patient assigned")}</p>
          <small>${escapeHtml(bed.detail)}</small>
          <div class="bed-meta">
            <span>Days: ${bed.admissionDate ? daysCount(bed.admissionDate) : "-"}</span>
            <span>Last check: ${escapeHtml(bed.lastCheck || "-")}</span>
          </div>
          <em>${escapeHtml(bed.flag)}</em>
        </button>
      `).join("")}
    </div>
  `;
}

function adminSetupView() {
  const s = state.bedSetup;
  const admin = state.clinicAdmin;
  if (state.adminSetupMode === "bed") {
    return `
      <div class="admin-detail-head">
        <button class="secondary-button" data-action="admin-setup-list">Back to setup list</button>
        <div>
          <h2>Bed Location Setup</h2>
          <p>Setup hospital place hierarchy, bed number, room, ward, and visual bed map.</p>
        </div>
      </div>
      <div class="admin-setup-grid">
        <section class="clinic-panel">
          <div class="clinic-head">
            <div>
              <h2>Bed Location Setup</h2>
              <p>Administrator defines hospital place hierarchy and bed numbers.</p>
            </div>
            <button class="primary-button" data-action="generate-bed-map">Generate map</button>
          </div>
          <div class="setup-form">
            <label>Hospital<input id="setupHospital" value="${escapeHtml(s.hospital)}"></label>
            <label>Building<input id="setupBuilding" value="${escapeHtml(s.building)}"></label>
            <label>Floor<input id="setupFloor" value="${escapeHtml(s.floor)}"></label>
            <label>Ward<input id="setupWard" value="${escapeHtml(s.ward)}"></label>
            <label>Room<input id="setupRoom" value="${escapeHtml(s.room)}"></label>
            <label>Bed prefix<input id="setupPrefix" value="${escapeHtml(s.bedPrefix)}"></label>
            <label>Rows<input type="number" id="setupRows" value="${s.rows}"></label>
            <label>Columns<input type="number" id="setupCols" value="${s.cols}"></label>
            <label>Start no<input type="number" id="setupStart" value="${s.bedStart}"></label>
            <label>Default bed type<select id="setupType"><option ${s.selectedType === "General" ? "selected" : ""}>General</option><option ${s.selectedType === "Pediatric" ? "selected" : ""}>Pediatric</option><option ${s.selectedType === "ICU" ? "selected" : ""}>ICU</option><option ${s.selectedType === "Isolation" ? "selected" : ""}>Isolation</option></select></label>
          </div>
          <div class="clinic-action-row">
            <button class="secondary-button" data-action="save-bed-setup">Save setup</button>
            <button class="secondary-button" data-action="add-single-bed">Add one bed</button>
            <button class="primary-button" data-action="publish-bed-map">Publish to Bed Board</button>
          </div>
        </section>

        <section class="clinic-panel bed-map-panel">
          <div class="clinic-head">
            <div>
              <h2>Draw Bed Map</h2>
              <p>${escapeHtml(s.hospital)} / ${escapeHtml(s.building)} / ${escapeHtml(s.floor)} / ${escapeHtml(s.ward)} / ${escapeHtml(s.room)}</p>
            </div>
            ${badge(`${s.map.length} beds`)}
          </div>
          <div class="bed-map-canvas" style="--map-cols:${s.cols}">
            ${s.map.map((bed) => `
              <button class="map-bed ${bed.status.toLowerCase()}" data-action="cycle-map-bed" data-id="${bed.id}" title="Click to cycle status">
                <strong>${escapeHtml(bed.id)}</strong>
                <span>${escapeHtml(bed.type)}</span>
                <em>${escapeHtml(bed.status)}</em>
              </button>
            `).join("")}
          </div>
          <div class="map-legend">
            <span class="available">Available</span>
            <span class="occupied">Occupied</span>
            <span class="cleaning">Cleaning</span>
            <span class="maintenance">Maintenance</span>
            <span class="isolation">Isolation</span>
          </div>
        </section>
      </div>
    `;
  }

  if (state.adminSetupMode === "clinic") {
    return `
      <div class="admin-detail-head">
        <button class="secondary-button" data-action="admin-setup-list">Back to setup list</button>
        <div>
          <h2>Clinic Setup</h2>
          <p>Setup doctor and nurse login, consultation room, and medication release workflow.</p>
        </div>
      </div>
      <section class="clinic-panel admin-clinic-panel">
        <div class="clinic-head">
          <div>
            <h2>Clinic Admin Setup</h2>
            <p>Setup login, consultation room, and medication handoff rules.</p>
          </div>
          <button class="primary-button" data-action="add-clinic-user">Add user</button>
        </div>
        <div class="admin-user-list">
          ${admin.users.map((user) => `
            <section class="admin-user-card">
              <div class="admin-user-head">
                <strong>${escapeHtml(user.name)}</strong>
                ${badge(user.role)}
              </div>
              <div class="setup-form admin-user-form">
                <label>Staff name<input data-admin-user="${user.id}" data-field="name" value="${escapeHtml(user.name)}"></label>
                <label>Role<select data-admin-user="${user.id}" data-field="role"><option ${user.role === "Doctor" ? "selected" : ""}>Doctor</option><option ${user.role === "Clinic Nurse" ? "selected" : ""}>Clinic Nurse</option><option ${user.role === "Pharmacist" ? "selected" : ""}>Pharmacist</option><option ${user.role === "Administrator" ? "selected" : ""}>Administrator</option></select></label>
                <label>Username<input data-admin-user="${user.id}" data-field="username" value="${escapeHtml(user.username)}"></label>
                <label>Password<input data-admin-user="${user.id}" data-field="password" value="${escapeHtml(user.password)}"></label>
                <label>Consultation / work room<input data-admin-user="${user.id}" data-field="room" value="${escapeHtml(user.room)}"></label>
                <label>Status<select data-admin-user="${user.id}" data-field="status"><option ${user.status === "Active" ? "selected" : ""}>Active</option><option ${user.status === "Suspended" ? "selected" : ""}>Suspended</option></select></label>
              </div>
            </section>
          `).join("")}
        </div>
        <div class="clinic-action-row">
          <button class="secondary-button" data-action="save-clinic-admin-users">Save login and room setup</button>
        </div>

        <div class="clinic-head sub-head">
          <div>
            <h2>Medication Release Setup</h2>
            <p>Define who prepares, verifies, signs off, and passes medication to patient.</p>
          </div>
        </div>
        <div class="setup-form">
          <label>Prepared by<input id="medPreparedBy" value="${escapeHtml(admin.medicationFlow.preparedBy)}"></label>
          <label>Signed off by<input id="medSignedOffBy" value="${escapeHtml(admin.medicationFlow.signedOffBy)}"></label>
          <label>Pass to patient by<input id="medHandoverBy" value="${escapeHtml(admin.medicationFlow.handoverToPatientBy)}"></label>
          <label>Double check<select id="medDoubleCheck"><option ${admin.medicationFlow.doubleCheckRequired ? "selected" : ""}>Required</option><option ${!admin.medicationFlow.doubleCheckRequired ? "selected" : ""}>Optional</option></select></label>
        </div>
        <div class="clinic-action-row">
          <button class="primary-button" data-action="save-medication-release-setup">Save medication setup</button>
        </div>
      </section>
    `;
  }

  return `
    <div class="admin-setup-list">
      <button class="admin-setup-card" data-action="admin-setup-open" data-mode="bed">
        <span>01</span>
        <strong>Bed Location Setup</strong>
        <small>Setup hospital, building, floor, ward, room, bed numbers, and draw the bed map.</small>
        <em>${escapeHtml(s.ward)} / ${escapeHtml(s.room)} / ${s.map.length} beds</em>
      </button>
      <button class="admin-setup-card" data-action="admin-setup-open" data-mode="clinic">
        <span>02</span>
        <strong>Clinic Setup</strong>
        <small>Setup doctor and nurse login, username, password, consultation room, and medication release sign-off.</small>
        <em>${admin.users.length} users / ${escapeHtml(admin.medicationFlow.signedOffBy)} signs medication</em>
      </button>
    </div>
  `;
}

function medicationView() {
  const flow = state.clinicAdmin.medicationFlow;
  return `
    ${sectionHeader("Medication Safety Gates", "Verify medication, block unsafe orders, and log administration controls.", `<button class="primary-button" data-action="open-modal" data-modal="medication">Verification modal</button>`)}
    <section class="clinic-panel medication-release-card">
      <div class="clinic-head">
        <div>
          <h2>Medication Release Control</h2>
          <p>Current admin setup before medicine is passed to patient.</p>
        </div>
        ${badge(flow.doubleCheckRequired ? "Double check required" : "Double check optional")}
      </div>
      <div class="release-steps">
        <div><span>Prepared by</span><strong>${escapeHtml(flow.preparedBy)}</strong></div>
        <div><span>Signed off by</span><strong>${escapeHtml(flow.signedOffBy)}</strong></div>
        <div><span>Pass to patient by</span><strong>${escapeHtml(flow.handoverToPatientBy)}</strong></div>
      </div>
    </section>
    ${dataTable(["Medicine", "State", "Prepared By", "Signed Off By", "Validation", "Action"], state.medication.map((m) => [
      escapeHtml(m.name),
      badge(m.status),
      escapeHtml(m.preparedBy || flow.preparedBy),
      escapeHtml(m.signedOffBy || flow.signedOffBy),
      escapeHtml(m.validation),
      m.status === "Ready" ? `<button class="table-button" data-action="administer-med" data-id="${m.id}">Administer</button>` : `<button class="table-button" data-action="verify-med" data-id="${m.id}">Verify</button>`
    ]))}
  `;
}

function inventoryView() {
  const prescriptionRows = prescriptionQueueRows();
  const controlledRows = state.inventory.filter((item) => item.control === "Controlled" || item.status === "Controlled drug");
  return `
    ${sectionHeader("Pharmacy Medication Stock", "Track medication stock by location, supplier, batch, expiry, controlled drug status, and doctor prescription queue.", `<div class="section-actions"><button class="primary-button" data-action="stock-in-medication">Stock in selected</button><button class="secondary-button" data-action="open-modal" data-modal="medication">Medication verification</button></div>`)}
    <div class="inventory-workspace">
      <section class="clinic-panel inventory-stock-panel">
        <div class="clinic-head">
          <div>
            <h2>Drug Stock Listing</h2>
            <p>Pharmacy can stock in, issue stock out, dispose expired items, and track supplier/batch.</p>
          </div>
          ${badge("Pharmacy")}
        </div>
        <div class="medication-stock-cards">
          ${state.inventory.map((item, index) => `
            <article class="medication-stock-card">
              <div class="stock-card-main">
                <span>Drug</span>
                <strong>${escapeHtml(item.item)}</strong>
              </div>
              <div><span>Location</span><strong>${escapeHtml(item.department)}</strong></div>
              <div><span>Qty</span><strong>${escapeHtml(item.qty)}</strong></div>
              <div><span>Supplier</span><strong>${escapeHtml(item.supplier)}</strong></div>
              <div><span>Batch / Expiry</span><strong>${escapeHtml(item.batch)}</strong><small>${escapeHtml(item.expiry)}</small></div>
              <div><span>Control</span>${badge(item.control)}</div>
              <div class="table-actions">
                <button class="table-button success-lite" data-action="stock-in-medication" data-id="${index}">Stock in</button>
                <button class="table-button success-lite" data-action="stock-out-medication" data-id="${index}">Issue</button>
                <button class="table-button danger-lite" data-action="dispose-medication-stock" data-id="${index}">Dispose</button>
              </div>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="clinic-panel inventory-queue-panel">
        <div class="clinic-head">
          <div>
            <h2>Doctor Prescription Queue</h2>
            <p>Call queue numbers from clinic, ICU, or ward when medication is ready for collection.</p>
          </div>
          ${badge(`${prescriptionRows.length} queued`)}
        </div>
        <div class="prescription-queue-cards">
          ${prescriptionRows.map((queue) => `
            <article class="prescription-queue-card">
              <div>
                <span>${escapeHtml(queue.source)}</span>
                <strong>${escapeHtml(queue.queueNo)}</strong>
              </div>
              <div>
                <span>Patient</span>
                <strong>${escapeHtml(queue.patient)}</strong>
              </div>
              <div>
                <span>Medication</span>
                <p>${escapeHtml(queue.medication)}</p>
              </div>
              ${badge(queue.status)}
              <button class="table-button success-lite" data-action="call-prescription-queue" data-queue="${escapeHtml(queue.queueNo)}">Call no</button>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="clinic-panel controlled-drug-panel">
        <div class="clinic-head">
          <div>
            <h2>Controlled Drug List</h2>
            <p>High-risk medication needs pharmacist verification, stock balance, and audit log.</p>
          </div>
          ${badge("Double verification")}
        </div>
        <div class="medication-stock-cards controlled">
          ${controlledRows.map((item) => `
            <article class="medication-stock-card">
              <div class="stock-card-main"><span>Drug</span><strong>${escapeHtml(item.item)}</strong></div>
              <div><span>Qty</span><strong>${escapeHtml(item.qty)}</strong></div>
              <div><span>Supplier</span><strong>${escapeHtml(item.supplier)}</strong></div>
              <div><span>Batch</span><strong>${escapeHtml(item.batch)}</strong></div>
              <div><span>Expiry</span><strong>${escapeHtml(item.expiry)}</strong></div>
              <div><span>Status</span>${badge(item.status)}</div>
            </article>
          `).join("")}
        </div>
      </section>
    </div>
  `;
}

function assetsView() {
  const headers = ["Asset", "Location", "Supplier", "Purchase Date", "Cost", "Status", "Action"];
  return `
    ${sectionHeader("Fixed Assets", "Add assets, find location, relocate/store, dispose, report malfunction, and preserve usage history. No depreciation module included.", `<div class="section-actions"><button class="primary-button" data-action="open-modal" data-modal="add-asset">Add asset</button><button class="secondary-button" data-action="calibration-check">Run calibration check</button></div>`)}
    <div class="asset-register" style="--cols:${headers.length}">
      <div class="asset-row asset-head">${headers.map((header) => `<strong>${escapeHtml(header)}</strong>`).join("")}</div>
      <div class="asset-row asset-filter">${headers.map((header, index) => `<input data-asset-filter="${index}" placeholder="Filter ${escapeHtml(header)}">`).join("")}</div>
      ${state.assets.map((asset) => `
        <div class="asset-row asset-data-row" data-asset-row="${asset.id}">
          <button class="link-button asset-name-link" data-action="open-asset-detail" data-id="${asset.id}">${escapeHtml(asset.name)}</button>
          <span>${escapeHtml(asset.assignment)}</span>
          <span>${escapeHtml(asset.supplier)}</span>
          <span>${escapeHtml(asset.purchaseDate)}</span>
          <span>${escapeHtml(asset.cost)}</span>
          <span>${badge(asset.status)}</span>
          <span><button class="table-button" data-action="open-asset-detail" data-id="${asset.id}">Details</button></span>
        </div>
      `).join("")}
    </div>
  `;
}

function reportsView() {
  return `
    ${sectionHeader("Patient Documents", "Upload, OCR, review, version, and audit all downloads.", `<button class="primary-button" data-action="open-modal" data-modal="report">Upload modal</button>`)}
    ${dataTable(["Report", "Linked To", "State", "Action"], state.reports.map((report) => [
      escapeHtml(report.name),
      escapeHtml(report.link),
      badge(report.status),
      report.status === "Reviewed" ? `<button class="table-button" data-action="download-report" data-id="${report.id}">Download</button>` : `<button class="table-button" data-action="review-report" data-id="${report.id}">Mark reviewed</button>`
    ]))}
  `;
}

function auditView() {
  return `
    ${sectionHeader("Immutable Event Log", "Every functional click writes a visible audit event.", `<button class="primary-button" data-action="export-audit">Export summary</button>`)}
    ${dataTable(["Time", "Action", "User", "Target", "Result"], state.auditRows.map((row) => row.map(escapeHtml)))}
  `;
}

function ruleCard(title, value, tone) {
  return `<div class="rule-card ${tone}"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(value)}</span></div>`;
}

function vital(label, value, detail, tone) {
  return `<div class="vital ${tone}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(detail)}</small></div>`;
}

function filteredPatients() {
  const q = state.query.trim().toLowerCase();
  if (!q) return patients;
  return patients.filter((p) => `${p.name} ${p.mrn} ${p.department} ${p.doctor}`.toLowerCase().includes(q));
}

function readBedSetupForm() {
  const s = state.bedSetup;
  s.hospital = document.getElementById("setupHospital")?.value || s.hospital;
  s.building = document.getElementById("setupBuilding")?.value || s.building;
  s.floor = document.getElementById("setupFloor")?.value || s.floor;
  s.ward = document.getElementById("setupWard")?.value || s.ward;
  s.room = document.getElementById("setupRoom")?.value || s.room;
  s.bedPrefix = document.getElementById("setupPrefix")?.value || s.bedPrefix;
  s.rows = Math.max(1, Number(document.getElementById("setupRows")?.value || s.rows));
  s.cols = Math.max(1, Number(document.getElementById("setupCols")?.value || s.cols));
  s.bedStart = Math.max(1, Number(document.getElementById("setupStart")?.value || s.bedStart));
  s.selectedType = document.getElementById("setupType")?.value || s.selectedType;
}

function readClinicAdminUsers() {
  state.clinicAdmin.users.forEach((user) => {
    document.querySelectorAll(`[data-admin-user="${user.id}"]`).forEach((input) => {
      const field = input.dataset.field;
      if (field && field in user) user[field] = input.value || user[field];
    });
  });
}

function readMedicationReleaseSetup() {
  const flow = state.clinicAdmin.medicationFlow;
  flow.preparedBy = document.getElementById("medPreparedBy")?.value || flow.preparedBy;
  flow.signedOffBy = document.getElementById("medSignedOffBy")?.value || flow.signedOffBy;
  flow.handoverToPatientBy = document.getElementById("medHandoverBy")?.value || flow.handoverToPatientBy;
  flow.doubleCheckRequired = (document.getElementById("medDoubleCheck")?.value || "Required") === "Required";
}

function generateBedMap() {
  const s = state.bedSetup;
  const beds = [];
  let count = s.bedStart;
  for (let y = 1; y <= s.rows; y += 1) {
    for (let x = 1; x <= s.cols; x += 1) {
      beds.push({
        id: `${s.bedPrefix}${String(count).padStart(2, "0")}`,
        room: s.room,
        ward: s.ward,
        x,
        y,
        type: s.selectedType,
        status: "Available"
      });
      count += 1;
    }
  }
  s.map = beds;
}

function syncPrescriptionLinesFromDom() {
  const rows = [...document.querySelectorAll(".rx-line")];
  if (!rows.length) return;
  state.doctor.prescriptionLines = rows.map((row, index) => ({
    medication: row.querySelector(".rx-medication")?.value || state.doctor.prescriptionLines[index]?.medication || "",
    dose: row.querySelector(".rx-dose")?.value || state.doctor.prescriptionLines[index]?.dose || "",
    frequency: row.querySelector(".rx-frequency")?.value || state.doctor.prescriptionLines[index]?.frequency || "",
    duration: row.querySelector(".rx-duration")?.value || state.doctor.prescriptionLines[index]?.duration || "",
    instructions: row.querySelector(".rx-instructions")?.value || state.doctor.prescriptionLines[index]?.instructions || ""
  }));
}

function syncLabLinesFromDom() {
  const rows = [...document.querySelectorAll(".rx-line")];
  if (!rows.length) return;
  state.doctor.labLines = rows.map((row, index) => ({
    testName: row.querySelector(".lab-test-name")?.value || state.doctor.labLines[index]?.testName || "",
    priority: row.querySelector(".lab-priority")?.value || state.doctor.labLines[index]?.priority || "Routine",
    specimen: row.querySelector(".lab-specimen")?.value || state.doctor.labLines[index]?.specimen || "Blood",
    location: row.querySelector(".lab-location")?.value || state.doctor.labLines[index]?.location || "Clinic treatment room",
    indication: row.querySelector(".lab-indication")?.value || state.doctor.labLines[index]?.indication || ""
  }));
}

function syncImagingLinesFromDom() {
  const rows = [...document.querySelectorAll(".rx-line")];
  if (!rows.length) return;
  state.doctor.imagingLines = rows.map((row, index) => ({
    imagingType: row.querySelector(".img-type")?.value || state.doctor.imagingLines[index]?.imagingType || "X-ray",
    bodyPart: row.querySelector(".img-body-part")?.value || state.doctor.imagingLines[index]?.bodyPart || "",
    priority: row.querySelector(".img-priority")?.value || state.doctor.imagingLines[index]?.priority || "Routine",
    transport: row.querySelector(".img-transport")?.value || state.doctor.imagingLines[index]?.transport || "Walk-in",
    indication: row.querySelector(".img-indication")?.value || state.doctor.imagingLines[index]?.indication || ""
  }));
}

function setView(view) {
  if (view === "doctor") {
    state.doctor.consultationQueueId = null;
  }
  if (view === "adminSetup") {
    state.adminSetupMode = "list";
  }
  state.view = view;
  document.querySelectorAll("[data-view]").forEach((el) => el.classList.toggle("active", el.dataset.view === view));
  render();
}

function render() {
  document.body.dataset.view = state.view;
  document.getElementById("viewTitle").textContent = viewTitles[state.view];
  document.querySelectorAll("[data-view]").forEach((el) => el.classList.toggle("active", el.dataset.view === state.view));
  document.getElementById("patientCard")?.remove();
  const views = {
    command: commandView,
    doctor: doctorView,
    clinicNurse: clinicNurseView,
    doctorWard: doctorWardView,
    nurse: nurseView,
    pediatric: pediatricView,
    icu: icuView,
    adminSetup: adminSetupView,
    beds: bedView,
    medication: medicationView,
    inventory: inventoryView,
    assets: assetsView,
    reports: reportsView,
    audit: auditView
  };
  document.getElementById("mainPanel").innerHTML = views[state.view]();
  renderCommunicationChip();
  renderToast();
  renderModal();
  attachDynamicHandlers();
}

function communicationContext() {
  const contexts = {
    doctor: { label: "Clinic Nurse", target: "Clinic Nurse Counter", title: "Communicate With Clinic Nurse", message: "Please assist this clinic patient and update the clinic task status." },
    doctorWard: { label: "Nurse Ward", target: "Nurse Ward Station", title: "Communicate With Nurse Ward", message: "Please review this ward patient and update the nursing observation/task status." },
    clinicNurse: { label: "Doctor Clinic", target: "Doctor Clinic", title: "Communicate With Doctor Clinic", message: "Doctor, please review the selected clinic patient." },
    nurse: { label: "Ward Doctor", target: "Ward Doctor", title: "Communicate With Ward Doctor", message: "Doctor, please review the selected ward patient." },
    icu: { label: "ICU Doctor", target: "ICU Doctor", title: "Communicate With ICU Doctor", message: "Doctor, please review the ICU patient and critical observation." },
    pediatric: { label: "Pediatric Doctor", target: "Pediatric Doctor", title: "Communicate With Pediatric Doctor", message: "Doctor, please review the pediatric patient and consent/dose status." }
  };
  return contexts[state.view] || { label: "Nurse Ward", target: "Nurse Ward Station", title: "Communicate With Nurse Ward", message: "Please review the selected patient and update pending task status." };
}

function renderCommunicationChip() {
  const chip = document.querySelector(".nurse-contact-chip");
  if (!chip) return;
  const context = communicationContext();
  chip.textContent = context.label;
  chip.title = context.title;
  chip.dataset.contactTarget = context.target;
}

function renderToast() {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = state.toast;
  toast.classList.toggle("show", Boolean(state.toast));
}

function modalContent() {
  const p = state.selectedPatient;
  const type = state.modal?.type;
  const baseMeta = `
    <div class="modal-patient-strip">
      <div><span>Patient</span><strong>${escapeHtml(p.name)}</strong></div>
      <div><span>MRN</span><strong>${escapeHtml(p.mrn)}</strong></div>
      <div><span>Dept</span><strong>${escapeHtml(p.department)}</strong></div>
      <div><span>Bed</span><strong>${escapeHtml(p.bed)}</strong></div>
    </div>
  `;

  if (type === "history-activity") {
    const item = state.patientHistory.find((history) => (history.id || history.title) === state.modal?.historyId) || state.patientHistory[0];
    return {
      kicker: "Patient Medical Activities",
      title: item ? `${item.type}: ${item.title}` : "Patient Activity",
      body: `
        ${baseMeta}
        <div class="modal-list">
          <div><b>Date</b><span>${escapeHtml(item?.date || "-")}</span></div>
          <div><b>Completed by</b><span>${escapeHtml(item?.completedBy || "Clinical team")}</span></div>
          <div><b>Completed action</b><span>${escapeHtml(item?.completedAction || item?.detail || "-")}</span></div>
          <div><b>Report / activity detail</b><span>${escapeHtml(item?.reportSummary || item?.detail || "-")}</span></div>
          <div><b>Doctor comment</b><span>${escapeHtml(item?.doctorComment || "No doctor comment recorded.")}</span></div>
        </div>
        <h3 class="modal-subtitle">Historical Medication At That Visit</h3>
        <div class="modal-list">
          ${(item?.medicationAtTime || []).map((med) => `<div><b>Medication</b><span>${escapeHtml(med)}</span></div>`).join("") || "<div><b>Medication</b><span>No medication recorded for this activity.</span></div>"}
        </div>
        <h3 class="modal-subtitle">Current Historical Medication</h3>
        <div class="modal-list">
          ${state.historicalMedication.map((med) => `<div><b>${escapeHtml(med.name)} ${escapeHtml(med.dose)}</b><span>${escapeHtml(med.frequency)} - ${escapeHtml(med.source)} - ${escapeHtml(med.status)}</span></div>`).join("")}
        </div>
      `,
      primary: "Mark reviewed",
      action: "mark-history-reviewed"
    };
  }

  if (type === "nurse-communication") {
    const nurses = state.clinicAdmin.users.filter((user) => user.role.includes("Nurse"));
    const context = communicationContext();
    return {
      kicker: "Communication",
      title: context.title,
      body: `
        ${baseMeta}
        <div class="modal-grid">
          <label>Contact target<select id="nurseContactTarget">
            <option>${escapeHtml(context.target)}</option>
            ${nurses.map((user) => `<option>${escapeHtml(user.name)} - ${escapeHtml(user.room)}</option>`).join("")}
            <option>Nurse Ward Station</option>
            <option>ICU Nurse Station</option>
            <option>Clinic Nurse Counter</option>
            <option>Ward Doctor</option>
            <option>Doctor Clinic</option>
          </select></label>
          <label>Priority<select id="nurseContactPriority"><option>Routine</option><option>Urgent</option><option>Critical</option></select></label>
        </div>
        <label class="modal-full">Message / reason<textarea id="nurseContactMessage">${escapeHtml(context.message)}</textarea></label>
        <div class="communication-actions">
          <button class="primary-button" data-action="call-nurse-now">Call now</button>
          <button class="secondary-button" data-action="send-nurse-message">Send message</button>
        </div>
        <div class="modal-alert amber"><strong>Audit</strong><span>Call/message event will be logged with patient context and priority.</span></div>
      `,
      primary: "Close",
      action: "close-modal"
    };
  }

  if (type === "nurse-check") {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    return {
      kicker: "Nurse Ward",
      title: "Add Nurse Check",
      body: `
        ${baseMeta}
        <div class="modal-grid">
          <label>Time<input id="modalNurseCheckTime" type="time" value="${now}"></label>
          <label>Blood pressure<input id="modalNurseCheckBp" value="${state.vitals.sbp}/${state.vitals.dbp}"></label>
          <label>Glucose<input id="modalNurseCheckGlucose" value="6.2 mmol/L"></label>
          <label>SpO2<input id="modalNurseCheckSpo2" value="${state.vitals.spo2}%"></label>
          <label>Temperature<input id="modalNurseCheckTemp" value="${state.vitals.temp} C"></label>
          <label>Pulse<input id="modalNurseCheckPulse" value="${state.vitals.hr}"></label>
        </div>
        <label class="modal-full">Nurse note<textarea id="modalNurseCheckNote">Hourly ward check recorded.</textarea></label>
      `,
      primary: "Save nurse check",
      action: "save-nurse-check-modal"
    };
  }

  if (type === "nurse-check-export") {
    const report = state.exportReport;
    return {
      kicker: "Nurse Check Report",
      title: "Report Generated",
      body: `
        ${baseMeta}
        <div class="modal-alert amber"><strong>${escapeHtml(report?.filename || "Report ready")}</strong><span>The file download has been triggered. Use the button below if your browser blocked it.</span></div>
        <label class="modal-full">Generated report content<textarea class="export-preview" readonly>${escapeHtml(report?.preview || "")}</textarea></label>
      `,
      primary: `Download ${report?.format?.toUpperCase() || "Report"}`,
      action: "download-export-report"
    };
  }

  if (type === "bed-detail") {
    const bed = state.beds.find((item) => item.id === state.selectedBedId) || state.beds[0];
    const patient = bedPatient(bed);
    const checks = state.patientChecks;
    return {
      kicker: "Bed Board",
      title: `${bed.id} Patient Situation`,
      body: `
        <div class="modal-list">
          <div><b>Bed status</b><span>${escapeHtml(bed.status)}</span></div>
          <div><b>Patient</b><span>${escapeHtml(bed.patient || "No patient assigned")}</span></div>
          <div><b>MRN</b><span>${escapeHtml(bed.mrn || patient?.mrn || "-")}</span></div>
          <div><b>Admission date</b><span>${escapeHtml(bed.admissionDate || "-")} (${bed.admissionDate ? daysCount(bed.admissionDate) : 0} day(s))</span></div>
          <div><b>Diagnosis / diseases</b><span>${escapeHtml((bed.diseases || [bed.detail]).join(", "))}</span></div>
          <div><b>Doctor / nurse</b><span>${escapeHtml(patient ? `${patient.doctor} / ${patient.nurse}` : "Not assigned")}</span></div>
        </div>
        <h3 class="modal-subtitle">Daily Observation</h3>
        <div class="modal-list">
          ${checks.map((check) => `<div><b>${escapeHtml(check.time)}</b><span>BP ${escapeHtml(check.bp)}, glucose ${escapeHtml(check.glucose)}, SpO2 ${escapeHtml(check.spo2)}, temp ${escapeHtml(check.temp)}, pulse ${escapeHtml(check.pulse)} - ${escapeHtml(check.note)}</span></div>`).join("")}
        </div>
        <h3 class="modal-subtitle">Medication History</h3>
        <div class="modal-list">
          ${state.historicalMedication.map((med) => `<div><b>${escapeHtml(med.name)} ${escapeHtml(med.dose)}</b><span>${escapeHtml(med.frequency)} - ${escapeHtml(med.source)} - ${escapeHtml(med.status)}</span></div>`).join("")}
        </div>
        <div class="communication-actions">
          <button class="primary-button" data-action="bed-check-in">Check in</button>
          <button class="secondary-button" data-action="bed-check-out">Check out</button>
        </div>
      `,
      primary: "Close",
      action: "close-modal"
    };
  }

  if (type === "add-asset") {
    return {
      kicker: "Fixed Assets",
      title: "Add New Asset",
      body: `
        <div class="modal-grid">
          <label>Asset name<input id="newAssetName" placeholder="e.g. ECG Machine ECG-014"></label>
          <label>Location<select id="newAssetLocation">${state.assetStores.map((room) => `<option>${escapeHtml(room)}</option>`).join("")}</select></label>
          <label>Supplier<input id="newAssetSupplier" placeholder="Supplier name"></label>
          <label>Purchase date<input id="newAssetPurchaseDate" type="date" value="2026-05-19"></label>
          <label>Cost<input id="newAssetCost" placeholder="RM 0.00"></label>
          <label>Status<select id="newAssetStatus"><option>Stored</option><option>Assigned to patient</option><option>Calibration valid</option><option>Maintenance</option></select></label>
        </div>
      `,
      primary: "Add asset",
      action: "save-new-asset"
    };
  }

  if (type === "asset-detail") {
    const asset = state.assets.find((item) => item.id === state.modal?.assetId) || state.assets[0];
    return {
      kicker: "Fixed Assets",
      title: asset.name,
      body: `
        <div class="modal-list">
          <div><b>Current location</b><span>${escapeHtml(asset.assignment)}</span></div>
          <div><b>Status</b><span>${escapeHtml(asset.status)}</span></div>
          <div><b>Supplier</b><span>${escapeHtml(asset.supplier)}</span></div>
          <div><b>Purchase date</b><span>${escapeHtml(asset.purchaseDate)}</span></div>
          <div><b>Cost</b><span>${escapeHtml(asset.cost)}</span></div>
        </div>
        <div class="modal-grid">
          <label>Relocate / store to<select id="assetDetailLocation">${state.assetStores.map((room) => `<option ${room === asset.assignment ? "selected" : ""}>${escapeHtml(room)}</option>`).join("")}<option ${asset.assignment === "Biomedical / Maintenance" ? "selected" : ""}>Biomedical / Maintenance</option></select></label>
          <label>Reassign to bed / department<input id="assetDetailAssign" value="${escapeHtml(state.selectedPatient.bed)}"></label>
        </div>
        <div class="communication-actions">
          <button class="primary-button" data-action="asset-detail-relocate">Relocate / store</button>
          <button class="secondary-button" data-action="asset-detail-reassign">Reassign</button>
          <button class="secondary-button" data-action="asset-detail-dispose">Dispose</button>
          <button class="danger-button" data-action="asset-detail-malfunction">Report malfunction</button>
        </div>
      `,
      primary: "Close",
      action: "close-modal"
    };
  }

  if (type === "doctor") {
    return {
      kicker: "Doctor Clinic",
      title: "Consultation Order Review",
      body: `
        ${baseMeta}
        <div class="modal-grid">
          <label>Assessment<textarea id="modalAssessment">${escapeHtml(p.diagnosis)}</textarea></label>
          <label>Plan<textarea id="modalPlan">Order lab, send prescription to pharmacy verification, schedule follow-up.</textarea></label>
        </div>
        <div class="modal-checks">
          <span>Allergy check active</span><span>Duplicate medicine check active</span><span>Audit required</span>
        </div>
      `,
      primary: "Save consultation",
      action: "modal-save-consultation"
    };
  }

  if (type === "handover") {
    const pending = state.nurseTasks.filter((task) => task.status !== "Completed");
    return {
      kicker: "Nurse Ward",
      title: "Shift Handover",
      body: `
        ${baseMeta}
        <label class="modal-full">Handover note<textarea id="modalHandover">Pending tasks: ${pending.map((task) => task.task).join("; ") || "none"}.</textarea></label>
        <div class="modal-list">${pending.map((task) => `<div><b>${escapeHtml(task.bed)}</b><span>${escapeHtml(task.task)}</span></div>`).join("") || "<div><b>Clear</b><span>No pending tasks</span></div>"}</div>
      `,
      primary: "Save handover",
      action: "save-handover"
    };
  }

  if (type === "consent") {
    return {
      kicker: "Pediatric Ward",
      title: "Guardian Consent",
      body: `
        ${baseMeta}
        <div class="modal-grid">
          <label>Guardian name<input id="guardianName" value="Tan Siew Mei"></label>
          <label>Procedure<input id="procedureName" value="Lumbar puncture"></label>
        </div>
        <label class="check-row"><input id="guardianConsentCheck" type="checkbox" ${state.pediatric.guardianConsent ? "checked" : ""}> Guardian identity verified and consent captured</label>
      `,
      primary: "Capture consent",
      action: "capture-consent"
    };
  }

  if (type === "icu-alert") {
    return {
      kicker: "ICU Ward",
      title: "Critical Alert Escalation",
      body: `
        ${baseMeta}
        <div class="modal-alert red"><strong>SpO2 ${state.icu.spo2}%</strong><span>Critical oxygen alert will notify assigned doctor and ICU nurse.</span></div>
        <label class="modal-full">Escalation reason<textarea id="modalEscalation">Low oxygen, abnormal BP, high fever, fluid balance negative.</textarea></label>
      `,
      primary: "Escalate now",
      action: "icu-escalate"
    };
  }

  if (type === "bed-transfer") {
    return {
      kicker: "Bed Management",
      title: "Transfer / Assign Bed",
      body: `
        ${baseMeta}
        <div class="modal-grid">
          <label>Target bed<select id="targetBed"><option>P2-12</option><option>ISO-02</option><option>W1-09</option></select></label>
          <label>Reason<input id="bedReason" value="Clinical assignment"></label>
        </div>
        <div class="modal-alert amber"><strong>Validation</strong><span>Occupied and maintenance beds cannot be double assigned.</span></div>
      `,
      primary: "Assign bed",
      action: "assign-bed"
    };
  }

  if (type === "medication") {
    return {
      kicker: "Medication Harness",
      title: "Pharmacy Verification",
      body: `
        ${baseMeta}
        <div class="modal-list">${state.medication.map((med) => `<div><b>${escapeHtml(med.name)}</b><span>${escapeHtml(med.status)} - ${escapeHtml(med.validation)}</span></div>`).join("")}</div>
        <label class="check-row"><input type="checkbox" checked> Apply allergy, expiry, duplicate and high-risk checks</label>
      `,
      primary: "Verify eligible",
      action: "verify-all-meds"
    };
  }

  if (type === "report") {
    return {
      kicker: "Report Upload",
      title: "Upload Patient Report",
      body: `
        ${baseMeta}
        <div class="modal-grid">
          <label>File name<input id="modalReportName" value="uploaded-report.pdf"></label>
          <label>Document type<select><option>Lab report</option><option>Imaging</option><option>Referral</option></select></label>
        </div>
        <label class="check-row"><input type="checkbox" checked> Link to current patient and encounter, run OCR, require doctor review</label>
      `,
      primary: "Upload report",
      action: "upload-report"
    };
  }

  if (type === "new-patient") {
    return {
      kicker: "Clinic Nurse",
      title: "New Patient Registration",
      body: `
        <div class="modal-grid">
          <label>Full name<input id="newPatientName" placeholder="Patient full name"></label>
          <label>IC / Passport<input id="newPatientId" placeholder="Identity number"></label>
          <label>Age<input id="newPatientAge" type="number" placeholder="Age"></label>
          <label>Sex<select id="newPatientSex"><option>Male</option><option>Female</option><option>Other</option></select></label>
          <label>Mobile no.<input id="newPatientPhone" placeholder="+60..."></label>
          <label>Emergency contact<input id="newPatientEmergency" placeholder="Name / phone"></label>
          <label>Visit reason<input id="newPatientReason" placeholder="Chief complaint / visit reason"></label>
          <label>Assigned doctor<select id="newPatientDoctor"><option>Dr. Rahman</option><option>Dr. Ong</option><option>Dr. Devi</option></select></label>
        </div>
        <label class="modal-full">Allergies / current medication / important history<textarea id="newPatientHistory" placeholder="Medication allergies, medication currently taken, previous diagnosis..."></textarea></label>
        <label class="check-row"><input id="newPatientConsent" type="checkbox"> Consent for clinic registration and data capture confirmed</label>
      `,
      primary: "Register patient",
      action: "save-new-patient"
    };
  }

  if (type === "prescription") {
    const queue = currentOrderContext();
    return {
      kicker: "Doctor Clinic",
      title: "New Prescription",
      body: `
        <div class="modal-patient-strip">
          <div><span>Queue No</span><strong>${escapeHtml(queue.no)}</strong></div>
          <div><span>Patient</span><strong>${escapeHtml(queue.patient)}</strong></div>
          <div><span>MRN</span><strong>${escapeHtml(queue.mrn)}</strong></div>
          <div><span>Doctor</span><strong>${escapeHtml(queue.doctor)}</strong></div>
        </div>
        <div class="rx-lines">
          ${state.doctor.prescriptionLines.map((line, index) => `
            <section class="rx-line">
              <div class="rx-line-head">
                <strong>Medication ${index + 1}</strong>
                ${state.doctor.prescriptionLines.length > 1 ? `<button class="link-button" data-action="remove-rx-line" data-index="${index}">Remove</button>` : ""}
              </div>
              <div class="modal-grid">
                <label>Medication name<input class="rx-medication" data-index="${index}" placeholder="e.g. Amoxicillin" value="${escapeHtml(line.medication)}"></label>
                <label>Dose<input class="rx-dose" data-index="${index}" placeholder="e.g. 500 mg" value="${escapeHtml(line.dose)}"></label>
                <label>Frequency<input class="rx-frequency" data-index="${index}" placeholder="e.g. three times daily" value="${escapeHtml(line.frequency)}"></label>
                <label>Duration<input class="rx-duration" data-index="${index}" placeholder="e.g. 5 days" value="${escapeHtml(line.duration)}"></label>
              </div>
              <label class="modal-full">Instructions<textarea class="rx-instructions" data-index="${index}" placeholder="After food, warning, special instruction...">${escapeHtml(line.instructions)}</textarea></label>
            </section>
          `).join("")}
        </div>
        <button class="secondary-button full-width-button" data-action="add-rx-line">Add another medication</button>
        <div class="modal-alert amber"><strong>Safety check</strong><span>Allergy, duplicate medicine, and dose checks will run before pharmacy queue.</span></div>
      `,
      primary: "Save prescription",
      action: "save-prescription-draft"
    };
  }

  if (type === "confirm-prescription") {
    const draft = state.doctor.prescriptionPendingConfirm;
    return {
      kicker: "Prescription Confirmation",
      title: "Send To Pharmacy?",
      body: `
        <div class="modal-alert amber"><strong>Confirm send</strong><span>Once confirmed, this prescription will be sent to pharmacy collection queue.</span></div>
        <div class="modal-list">
          <div><b>Queue no</b><span>${escapeHtml(draft?.queueNo || "-")}</span></div>
          <div><b>Patient</b><span>${escapeHtml(draft?.patient || "-")}</span></div>
          ${(draft?.items || []).map((item, index) => `
            <div><b>Medication ${index + 1}</b><span>${escapeHtml(item.medication)} ${escapeHtml(item.dose)} - ${escapeHtml(item.frequency)} - ${escapeHtml(item.duration)}</span></div>
          `).join("")}
        </div>
      `,
      primary: "Yes, send to pharmacy",
      action: "confirm-send-pharmacy"
    };
  }

  if (type === "lab-request") {
    const queue = currentOrderContext();
    return {
      kicker: "Doctor Clinic",
      title: "New Lab Request",
      body: `
        <div class="modal-patient-strip">
          <div><span>Queue No</span><strong>${escapeHtml(queue.no)}</strong></div>
          <div><span>Patient</span><strong>${escapeHtml(queue.patient)}</strong></div>
          <div><span>MRN</span><strong>${escapeHtml(queue.mrn)}</strong></div>
          <div><span>Doctor</span><strong>${escapeHtml(queue.doctor)}</strong></div>
        </div>
        <div class="rx-lines">
          ${state.doctor.labLines.map((line, index) => `
            <section class="rx-line">
              <div class="rx-line-head">
                <strong>Lab Request ${index + 1}</strong>
                ${state.doctor.labLines.length > 1 ? `<button class="link-button" data-action="remove-lab-line" data-index="${index}">Remove</button>` : ""}
              </div>
              <div class="modal-grid">
                <label>Test / panel name<input class="lab-test-name" data-index="${index}" placeholder="e.g. Full blood count" value="${escapeHtml(line.testName)}"></label>
                <label>Priority<select class="lab-priority" data-index="${index}"><option ${line.priority === "Routine" ? "selected" : ""}>Routine</option><option ${line.priority === "Urgent" ? "selected" : ""}>Urgent</option><option ${line.priority === "STAT" ? "selected" : ""}>STAT</option></select></label>
                <label>Specimen<select class="lab-specimen" data-index="${index}"><option ${line.specimen === "Blood" ? "selected" : ""}>Blood</option><option ${line.specimen === "Urine" ? "selected" : ""}>Urine</option><option ${line.specimen === "Swab" ? "selected" : ""}>Swab</option><option ${line.specimen === "Stool" ? "selected" : ""}>Stool</option></select></label>
                <label>Collection location<input class="lab-location" data-index="${index}" value="${escapeHtml(line.location)}"></label>
              </div>
              <label class="modal-full">Clinical indication<textarea class="lab-indication" data-index="${index}" placeholder="Reason for lab request...">${escapeHtml(line.indication)}</textarea></label>
            </section>
          `).join("")}
        </div>
        <button class="secondary-button full-width-button" data-action="add-lab-line">Add another lab request</button>
        <div class="modal-alert amber"><strong>Nurse process</strong><span>After confirmation, this request keeps the same queue number and goes to nurse for specimen collection/process.</span></div>
      `,
      primary: "Save lab request",
      action: "save-lab-draft"
    };
  }

  if (type === "confirm-lab") {
    const draft = state.doctor.labPendingConfirm;
    return {
      kicker: "Lab Request Confirmation",
      title: "Send To Nurse Process Queue?",
      body: `
        <div class="modal-alert amber"><strong>Confirm send</strong><span>Once confirmed, this lab request will be sent to nurse processing with the same queue number.</span></div>
        <div class="modal-list">
          <div><b>Queue no</b><span>${escapeHtml(draft?.queueNo || "-")}</span></div>
          <div><b>Patient</b><span>${escapeHtml(draft?.patient || "-")}</span></div>
          ${(draft?.items || []).map((item, index) => `
            <div><b>Lab ${index + 1}</b><span>${escapeHtml(item.testName)} - ${escapeHtml(item.priority)} - ${escapeHtml(item.specimen)}</span></div>
          `).join("")}
        </div>
      `,
      primary: "Yes, send to nurse",
      action: "confirm-send-nurse"
    };
  }

  if (type === "imaging-request") {
    const queue = currentOrderContext();
    return {
      kicker: "Doctor Clinic",
      title: "New Imaging Request",
      body: `
        <div class="modal-patient-strip">
          <div><span>Queue No</span><strong>${escapeHtml(queue.no)}</strong></div>
          <div><span>Patient</span><strong>${escapeHtml(queue.patient)}</strong></div>
          <div><span>MRN</span><strong>${escapeHtml(queue.mrn)}</strong></div>
          <div><span>Doctor</span><strong>${escapeHtml(queue.doctor)}</strong></div>
        </div>
        <div class="rx-lines">
          ${state.doctor.imagingLines.map((line, index) => `
            <section class="rx-line">
              <div class="rx-line-head">
                <strong>Imaging Request ${index + 1}</strong>
                ${state.doctor.imagingLines.length > 1 ? `<button class="link-button" data-action="remove-imaging-line" data-index="${index}">Remove</button>` : ""}
              </div>
              <div class="modal-grid">
                <label>Imaging type<select class="img-type" data-index="${index}"><option ${line.imagingType === "X-ray" ? "selected" : ""}>X-ray</option><option ${line.imagingType === "Ultrasound" ? "selected" : ""}>Ultrasound</option><option ${line.imagingType === "CT Scan" ? "selected" : ""}>CT Scan</option><option ${line.imagingType === "MRI" ? "selected" : ""}>MRI</option></select></label>
                <label>Body part<input class="img-body-part" data-index="${index}" placeholder="e.g. Chest" value="${escapeHtml(line.bodyPart)}"></label>
                <label>Priority<select class="img-priority" data-index="${index}"><option ${line.priority === "Routine" ? "selected" : ""}>Routine</option><option ${line.priority === "Urgent" ? "selected" : ""}>Urgent</option><option ${line.priority === "STAT" ? "selected" : ""}>STAT</option></select></label>
                <label>Transport need<select class="img-transport" data-index="${index}"><option ${line.transport === "Walk-in" ? "selected" : ""}>Walk-in</option><option ${line.transport === "Wheelchair" ? "selected" : ""}>Wheelchair</option><option ${line.transport === "Bed transfer" ? "selected" : ""}>Bed transfer</option></select></label>
              </div>
              <label class="modal-full">Clinical indication<textarea class="img-indication" data-index="${index}" placeholder="Reason for imaging request...">${escapeHtml(line.indication)}</textarea></label>
            </section>
          `).join("")}
        </div>
        <button class="secondary-button full-width-button" data-action="add-imaging-line">Add another imaging request</button>
        <div class="modal-alert amber"><strong>Nurse notification</strong><span>After confirmation, this request keeps the same queue number and notifies nurse to process/prepare patient for imaging.</span></div>
      `,
      primary: "Save imaging request",
      action: "save-imaging-draft"
    };
  }

  if (type === "confirm-imaging") {
    const draft = state.doctor.imagingPendingConfirm;
    return {
      kicker: "Imaging Request Confirmation",
      title: "Notify Nurse?",
      body: `
        <div class="modal-alert amber"><strong>Confirm notification</strong><span>Once confirmed, nurse receives the imaging preparation task using the same queue number.</span></div>
        <div class="modal-list">
          <div><b>Queue no</b><span>${escapeHtml(draft?.queueNo || "-")}</span></div>
          <div><b>Patient</b><span>${escapeHtml(draft?.patient || "-")}</span></div>
          ${(draft?.items || []).map((item, index) => `
            <div><b>Imaging ${index + 1}</b><span>${escapeHtml(item.imagingType)} ${escapeHtml(item.bodyPart)} - ${escapeHtml(item.priority)} - ${escapeHtml(item.transport)}</span></div>
          `).join("")}
        </div>
      `,
      primary: "Yes, notify nurse",
      action: "confirm-send-imaging-nurse"
    };
  }

  return {
    kicker: "Command Center",
    title: "Harness Workflow Launcher",
    body: `
      ${baseMeta}
      <div class="modal-list">
        <div><b>Core Data</b><span>One patient record across all departments</span></div>
        <div><b>Access</b><span>RBAC + department + patient assignment</span></div>
        <div><b>Audit</b><span>Every action writes an immutable event</span></div>
      </div>
    `,
    primary: "Open audit",
    action: "open-audit-from-modal"
  };
}

function renderModal() {
  let modalRoot = document.getElementById("modalRoot");
  if (!modalRoot) {
    modalRoot = document.createElement("div");
    modalRoot.id = "modalRoot";
    document.body.appendChild(modalRoot);
  }

  if (!state.modal) {
    modalRoot.innerHTML = "";
    return;
  }

  const content = modalContent();
  modalRoot.innerHTML = `
    <div class="modal-backdrop">
      <section class="saas-modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <header class="modal-header">
          <div>
            <p>${escapeHtml(content.kicker)}</p>
            <h2 id="modalTitle">${escapeHtml(content.title)}</h2>
          </div>
          <button class="modal-close" data-action="close-modal" aria-label="Close modal">×</button>
        </header>
        <div class="modal-body">${content.body}</div>
        <footer class="modal-footer">
          <button class="secondary-button" data-action="close-modal">Cancel</button>
          <button class="primary-button" data-action="${content.action}">${escapeHtml(content.primary)}</button>
        </footer>
      </section>
    </div>
  `;
}

function attachDynamicHandlers() {
  document.querySelectorAll("[data-patient]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedPatient = patients.find((p) => p.mrn === button.dataset.patient) || state.selectedPatient;
      addAudit("patient.viewed", "Current User", state.selectedPatient.mrn, "Selected patient in clinic queue");
      render();
    });
  });

  document.querySelectorAll("[data-vital]").forEach((input) => {
    input.addEventListener("input", () => {
      state.vitals[input.dataset.vital] = Number(input.value);
      render();
    });
  });

  document.querySelectorAll("[data-asset-filter]").forEach((input) => {
    input.addEventListener("input", () => {
      const filters = [...document.querySelectorAll("[data-asset-filter]")].map((el) => el.value.trim().toLowerCase());
      document.querySelectorAll("[data-asset-row]").forEach((row) => {
        const cells = [...row.children].map((cell) => cell.textContent.toLowerCase());
        const visible = filters.every((filter, index) => !filter || cells[index]?.includes(filter));
        row.style.display = visible ? "grid" : "none";
      });
    });
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action, button.dataset));
  });
}

function handleAction(action, data) {
  if (action === "open-view" || action === "flow") return setView(data.target);
  if (action === "admin-setup-open") {
    state.adminSetupMode = data.mode || "list";
    return render();
  }
  if (action === "admin-setup-list") {
    state.adminSetupMode = "list";
    return render();
  }
  if (action === "call-nurse-now" || action === "send-nurse-message") {
    const context = communicationContext();
    const target = document.getElementById("nurseContactTarget")?.value || context.target;
    const priority = document.getElementById("nurseContactPriority")?.value || "Routine";
    const message = document.getElementById("nurseContactMessage")?.value?.trim() || "No message entered";
    const auditAction = action === "call-nurse-now" ? "communication.called" : "communication.message.sent";
    addAudit(auditAction, "Current User", target, `${priority}: ${message}`);
    notify(action === "call-nurse-now" ? `${target} called.` : `Message sent to ${target}.`);
    state.modal = null;
    return render();
  }
  if (action === "export-nurse-checks") {
    const format = data.format || "csv";
    const filename = `${state.selectedPatient.mrn}-nurse-checks.${format === "excel" ? "xls" : format}`;
    const content = format === "excel" ? nurseChecksExcelHtml() : format === "pdf" ? nurseChecksPdfHtml() : nurseChecksCsv();
    const mimeType = format === "excel" ? "application/vnd.ms-excel" : format === "pdf" ? "text/html" : "text/csv";
    state.exportReport = {
      format,
      filename,
      content,
      mimeType,
      preview: nurseChecksCsv()
    };
    if (format === "pdf") {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(content);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    } else {
      downloadTextFile(filename, content, mimeType);
    }
    state.modal = { type: "nurse-check-export" };
    addAudit("nurse.checks.exported", "Current User", state.selectedPatient.mrn, `Nurse checks exported as ${format.toUpperCase()}`);
    notify(`Nurse check report exported as ${format.toUpperCase()}.`);
    return render();
  }
  if (action === "download-export-report") {
    if (state.exportReport) {
      downloadTextFile(state.exportReport.filename, state.exportReport.content, state.exportReport.mimeType);
      addAudit("nurse.checks.downloaded", "Current User", state.selectedPatient.mrn, `${state.exportReport.filename} downloaded`);
      notify(`${state.exportReport.filename} downloaded.`);
    }
    return render();
  }
  if (action === "open-bed-detail") {
    state.selectedBedId = data.id;
    state.modal = { type: "bed-detail" };
    const bed = state.beds.find((item) => item.id === data.id);
    addAudit("bed.detail.viewed", "Current User", data.id, `${bed?.patient || "Empty bed"} situation opened`);
    return render();
  }
  if (action === "bed-check-in") {
    const bed = state.beds.find((item) => item.id === state.selectedBedId);
    if (bed && ["Available", "Reserved", "Cleaning"].includes(bed.status)) {
      const p = state.selectedPatient;
      bed.status = "Occupied";
      bed.patient = p.name;
      bed.mrn = p.mrn;
      bed.detail = p.diagnosis;
      bed.flag = "Checked in";
      bed.admissionDate = new Date().toISOString().slice(0, 10);
      bed.lastCheck = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
      bed.diseases = [p.diagnosis, p.risk];
      addAudit("bed.checked_in", "Ward Clerk", bed.id, `${p.name} checked in`);
      notify(`${p.name} checked in to ${bed.id}.`);
    } else {
      notify("Only available, reserved, or cleaning beds can be checked in.");
    }
    return render();
  }
  if (action === "bed-check-out") {
    const bed = state.beds.find((item) => item.id === state.selectedBedId);
    if (bed && bed.patient) {
      const patientName = bed.patient;
      bed.status = "Cleaning";
      bed.patient = "";
      bed.mrn = "";
      bed.flag = "Pending cleaning";
      bed.detail = "Awaiting housekeeping";
      bed.lastCheck = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
      addAudit("bed.checked_out", "Ward Clerk", bed.id, `${patientName} checked out; bed sent to cleaning`);
      notify(`${patientName} checked out from ${bed.id}.`);
    } else {
      notify("No patient assigned to check out.");
    }
    return render();
  }
  if (action === "save-bed-setup" || action === "generate-bed-map") {
    readBedSetupForm();
    if (action === "generate-bed-map") generateBedMap();
    addAudit("bed.setup.saved", "Administrator", state.bedSetup.ward, "Bed location setup saved");
    notify(action === "generate-bed-map" ? "Bed map generated." : "Bed setup saved.");
    return render();
  }
  if (action === "add-single-bed") {
    readBedSetupForm();
    const next = state.bedSetup.map.length + state.bedSetup.bedStart;
    state.bedSetup.map.push({
      id: `${state.bedSetup.bedPrefix}${String(next).padStart(2, "0")}`,
      room: state.bedSetup.room,
      ward: state.bedSetup.ward,
      x: state.bedSetup.map.length + 1,
      y: 1,
      type: state.bedSetup.selectedType,
      status: "Available"
    });
    addAudit("bed.created", "Administrator", state.bedSetup.ward, "Single bed added to map");
    notify("New bed added.");
    return render();
  }
  if (action === "cycle-map-bed") {
    const bed = state.bedSetup.map.find((item) => item.id === data.id);
    if (bed) {
      const statuses = ["Available", "Occupied", "Cleaning", "Maintenance", "Isolation"];
      bed.status = statuses[(statuses.indexOf(bed.status) + 1) % statuses.length];
      addAudit("bed.map.edited", "Administrator", bed.id, `Status changed to ${bed.status}`);
      notify(`${bed.id} changed to ${bed.status}.`);
    }
    return render();
  }
  if (action === "publish-bed-map") {
    addAudit("bed.map.published", "Administrator", state.bedSetup.ward, `${state.bedSetup.map.length} bed map published`);
    notify("Bed map published to Bed Board.");
    return setView("beds");
  }
  if (action === "save-clinic-admin-users") {
    readClinicAdminUsers();
    addAudit("clinic.admin.users.saved", "Administrator", "Clinic users", "Doctor and nurse usernames, passwords, status, and rooms saved");
    notify("Clinic login and room setup saved.");
    return render();
  }
  if (action === "add-clinic-user") {
    readClinicAdminUsers();
    const next = state.clinicAdmin.users.length + 1;
    state.clinicAdmin.users.push({
      id: `u-new-${Date.now()}`,
      role: "Clinic Nurse",
      name: `New Staff ${next}`,
      username: `staff${next}`,
      password: "ChangeMe@123",
      room: "Treatment 01",
      status: "Active"
    });
    addAudit("clinic.admin.user.added", "Administrator", "Clinic users", `New Staff ${next} added`);
    notify("New clinic user added.");
    return render();
  }
  if (action === "save-medication-release-setup") {
    readMedicationReleaseSetup();
    addAudit("medication.release.setup.saved", "Administrator", "Medication release", `${state.clinicAdmin.medicationFlow.preparedBy} prepares, ${state.clinicAdmin.medicationFlow.signedOffBy} signs off`);
    notify("Medication release setup saved.");
    return render();
  }
  if (action === "select-clinic-queue") {
    state.clinic.selectedQueue = data.id;
    return render();
  }
  if (action === "register-clinic-patient") {
    state.modal = { type: "new-patient" };
    return render();
  }
  if (action === "save-new-patient") {
    const name = document.getElementById("newPatientName")?.value?.trim();
    const age = Number(document.getElementById("newPatientAge")?.value || 0);
    const sex = document.getElementById("newPatientSex")?.value || "Other";
    const phone = document.getElementById("newPatientPhone")?.value?.trim() || "No phone";
    const emergency = document.getElementById("newPatientEmergency")?.value?.trim() || "No emergency contact";
    const reason = document.getElementById("newPatientReason")?.value?.trim() || "New clinic registration";
    const doctor = document.getElementById("newPatientDoctor")?.value || "Dr. Rahman";
    const history = document.getElementById("newPatientHistory")?.value?.trim();
    const consent = document.getElementById("newPatientConsent")?.checked;
    if (!name) {
      notify("Please enter patient full name.");
      return render();
    }
    if (!consent) {
      notify("Please confirm registration consent.");
      return render();
    }
    const next = state.clinic.queue.length + 14;
    const queueNo = `Q-${String(next).padStart(3, "0")}`;
    const mrn = `MRN-${12000 + next}`;
    const id = `q${Date.now()}`;
    state.clinic.queue.push({
      id,
      no: queueNo,
      patient: name,
      mrn,
      age,
      sex,
      reason,
      doctor,
      status: "Registered",
      reports: history ? ["Registration history note"] : [],
      called: false,
      transfer: "",
      phone,
      emergency
    });
    state.clinic.selectedQueue = id;
    if (history) {
      state.patientHistory.unshift({
        date: new Date().toISOString().slice(0, 10),
        type: "Registration History",
        title: name,
        detail: history
      });
    }
    state.modal = null;
    addAudit("patient.registered", "Clinic Nurse", queueNo, `${name} registered with ${mrn}, assigned to ${doctor}`);
    notify(`${name} registered and added to queue.`);
    return render();
  }
  if (action === "save-registration") {
    const q = state.clinic.queue.find((item) => item.id === state.clinic.selectedQueue);
    if (q) {
      q.patient = document.getElementById("clinicPatientName")?.value || q.patient;
      q.reason = document.getElementById("clinicReason")?.value || q.reason;
      q.doctor = document.getElementById("clinicDoctor")?.value || q.doctor;
      q.status = "Registered";
      addAudit("clinic.registration.saved", "Clinic Nurse", q.no, `${q.patient} assigned to ${q.doctor}`);
      notify("Registration saved.");
    }
  }
  if (action === "take-clinic-vitals") {
    const q = state.clinic.queue.find((item) => item.id === state.clinic.selectedQueue);
    if (q) {
      q.status = "Vitals Done";
      addAudit("clinic.vitals.recorded", "Clinic Nurse", q.no, "Clinic vitals completed before doctor call");
      notify("Vitals recorded.");
    }
  }
  if (action === "call-doctor") {
    const q = state.clinic.queue.find((item) => item.id === state.clinic.selectedQueue);
    if (q) {
      state.clinic.queue.forEach((item) => { item.called = false; });
      q.called = true;
      q.status = "Called";
      addAudit("doctor.called", "Clinic Nurse", q.no, `${q.doctor} called for ${q.patient}`);
      notify(`${q.doctor} called for ${q.no}.`);
    }
  }
  if (action === "doctor-select-queue") {
    const q = state.clinic.queue.find((item) => item.id === data.id);
    if (q) {
      state.doctor.selectedQueueId = q.id;
      state.doctor.consultationQueueId = null;
      addAudit("doctor.history.reviewed", q.doctor, q.no, `${q.patient} history opened before call`);
    }
    return render();
  }
  if (action === "doctor-call-selected") {
    const q = state.clinic.queue.find((item) => item.id === state.doctor.selectedQueueId) || state.clinic.queue[0];
    if (q) {
      state.clinic.queue.forEach((item) => { item.called = false; });
      q.called = true;
      q.status = "With Doctor";
      state.doctor.selectedQueueId = q.id;
      state.doctor.consultationQueueId = q.id;
      addAudit("doctor.patient.called", q.doctor, q.no, `${q.patient} called into consultation after history review`);
      notify(`${q.no} ${q.patient} called into consultation.`);
    }
    return render();
  }
  if (action === "open-history-activity") {
    const item = state.patientHistory.find((history) => (history.id || history.title) === data.id);
    if (item) {
      state.modal = { type: "history-activity", historyId: item.id || item.title };
      addAudit("patient.activity.opened", "Dr. Rahman", item.title, `${item.type} history opened`);
    }
    return render();
  }
  if (action === "mark-history-reviewed") {
    const item = state.patientHistory.find((history) => (history.id || history.title) === state.modal?.historyId);
    if (item) {
      item.reviewedNow = true;
      addAudit("patient.activity.reviewed", "Dr. Rahman", item.title, "Historical activity reviewed before call");
      notify(`${item.title} marked reviewed.`);
    }
    state.modal = null;
    return render();
  }
  if (action === "doctor-pick-queue") {
    const q = state.clinic.queue.find((item) => item.id === data.id);
    if (q) {
      state.doctor.selectedQueueId = q.id;
      state.doctor.consultationQueueId = null;
      addAudit("doctor.history.reviewed", q.doctor, q.no, `${q.patient} history opened before call`);
    }
    return render();
  }
  if (action === "attach-clinic-report") {
    const q = state.clinic.queue.find((item) => item.id === state.clinic.selectedQueue);
    if (q) {
      q.reports.push("Attached clinic report.pdf");
      addAudit("clinic.report.attached", "Clinic Nurse", q.no, "Medical report attached before consultation");
      notify("Medical report attached.");
    }
  }
  if (action === "doctor-upload-report") {
    const queue = state.clinic.queue.find((q) => q.id === state.doctor.consultationQueueId) || currentOrderContext();
    const fileInput = document.getElementById("doctorReportFile");
    const typedName = document.getElementById("doctorReportName")?.value?.trim();
    const fileName = fileInput?.files?.[0]?.name || typedName;
    const reportType = document.getElementById("doctorReportType")?.value || "Medical report";
    if (!fileName) {
      notify("Please enter report name or choose a file.");
      return render();
    }
    const id = `r${Date.now()}`;
    state.reports.unshift({
      id,
      name: fileName,
      link: `${queue.mrn} / ${queue.no}`,
      status: `Doctor uploaded - ${reportType}`
    });
    queue.reports.push(fileName);
    state.patientHistory.unshift({
      id: `hist-report-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      type: "Patient Report Upload",
      title: fileName,
      detail: `${reportType} uploaded during consultation.`,
      completedBy: queue.doctor,
      completedAction: "Uploaded patient-provided medical report",
      doctorComment: "Report attached to current consultation for review and follow-up.",
      reportSummary: `${fileName} linked to ${queue.no} and ${queue.mrn}.`,
      medicationAtTime: state.historicalMedication.map((med) => `${med.name} ${med.dose}`.trim())
    });
    addAudit("doctor.report.uploaded", queue.doctor, queue.mrn, `${fileName} uploaded as ${reportType}`);
    notify(`${fileName} uploaded to patient record.`);
    return render();
  }
  if (action === "transfer-to-ward") {
    const q = state.clinic.queue.find((item) => item.id === state.clinic.selectedQueue);
    if (q) {
      const ward = document.getElementById("targetWard")?.value || "General Ward";
      const reason = document.getElementById("transferReason")?.value || "Observation required";
      q.status = "Transfer Requested";
      q.transfer = `${ward}: ${reason}`;
      addAudit("clinic.transfer.requested", "Clinic Nurse", q.no, `${q.patient} transfer to ${ward}: ${reason}`);
      notify("Transfer request sent to ward.");
    }
  }
  if (action === "open-modal") {
    state.modal = { type: data.modal };
    return render();
  }
  if (action === "close-modal") {
    state.modal = null;
    return render();
  }
  if (action === "open-audit-from-modal") {
    state.modal = null;
    return setView("audit");
  }
  if (action === "modal-save-consultation") {
    state.modal = null;
    state.doctor.soapSaved = true;
    addAudit("consultation.modal.saved", "Dr. Ong", state.selectedPatient.mrn, "Consultation modal submitted");
    notify("Consultation modal saved.");
    return render();
  }

  if (action === "save-soap") {
    state.doctor.soapSaved = true;
    addAudit("soap.saved", "Dr. Ong", state.selectedPatient.mrn, "SOAP note saved with before/after clinical values");
    notify("SOAP note saved.");
  }
  if (action === "order-lab") {
    state.doctor.labLines = [
      { testName: "", priority: "Routine", specimen: "Blood", location: "Clinic treatment room", indication: "" }
    ];
    state.modal = { type: "lab-request" };
    return render();
  }
  if (action === "add-lab-line") {
    syncLabLinesFromDom();
    state.doctor.labLines.push({ testName: "", priority: "Routine", specimen: "Blood", location: "Clinic treatment room", indication: "" });
    return render();
  }
  if (action === "remove-lab-line") {
    syncLabLinesFromDom();
    if (state.doctor.labLines.length > 1) state.doctor.labLines.splice(Number(data.index), 1);
    return render();
  }
  if (action === "save-lab-draft") {
    const queue = currentOrderContext();
    syncLabLinesFromDom();
    const items = state.doctor.labLines
      .map((line) => ({
        testName: line.testName.trim(),
        priority: line.priority,
        specimen: line.specimen,
        location: line.location.trim() || "Clinic treatment room",
        indication: line.indication.trim() || "Not specified"
      }))
      .filter((line) => line.testName || line.indication !== "Not specified");
    if (!items.length || items.some((line) => !line.testName)) {
      notify("Please key in each lab test name.");
      return render();
    }
    const draft = {
      id: `LAB-${Date.now()}`,
      queueNo: queue.no,
      patient: queue.patient,
      mrn: queue.mrn,
      doctor: queue.doctor,
      items,
      testName: items.map((item) => item.testName).join(", "),
      status: "Draft saved"
    };
    state.doctor.labDraft = draft;
    state.doctor.labPendingConfirm = draft;
    state.modal = { type: "confirm-lab" };
    addAudit("lab.request.draft.saved", queue.doctor, queue.no, `${items.length} lab request(s) saved as draft`);
    notify("Lab request draft saved. Please confirm send.");
    return render();
  }
  if (action === "confirm-send-nurse") {
    const draft = state.doctor.labPendingConfirm;
    if (!draft) {
      notify("No lab draft to send.");
      return render();
    }
    state.nurseProcessQueue.unshift({
      ...draft,
      testName: draft.items.map((item) => item.testName).join("; "),
      status: "Waiting nurse collection/process"
    });
    draft.items.forEach((item, index) => {
      state.nurseTasks.unshift({
        id: `lab-${Date.now()}-${index}`,
        task: `Lab collection - ${item.testName}`,
        patient: draft.patient,
        bed: draft.queueNo,
        due: item.priority === "STAT" ? "Due now" : "30m",
        control: `${item.specimen} specimen; ${item.location}`,
        status: "Pending",
        priority: item.priority === "Routine" ? "normal" : "urgent"
      });
    });
    state.doctor.labOrdered = true;
    state.doctor.labPendingConfirm = null;
    state.modal = null;
    addAudit("lab.request.sent.nurse", draft.doctor, draft.queueNo, `${draft.items.length} lab request(s) sent to nurse process queue`);
    notify(`Lab request sent to nurse for ${draft.queueNo}.`);
    return render();
  }
  if (action === "order-imaging") {
    state.doctor.imagingLines = [
      { imagingType: "X-ray", bodyPart: "", priority: "Routine", transport: "Walk-in", indication: "" }
    ];
    state.modal = { type: "imaging-request" };
    return render();
  }
  if (action === "add-imaging-line") {
    syncImagingLinesFromDom();
    state.doctor.imagingLines.push({ imagingType: "X-ray", bodyPart: "", priority: "Routine", transport: "Walk-in", indication: "" });
    return render();
  }
  if (action === "remove-imaging-line") {
    syncImagingLinesFromDom();
    if (state.doctor.imagingLines.length > 1) state.doctor.imagingLines.splice(Number(data.index), 1);
    return render();
  }
  if (action === "save-imaging-draft") {
    const queue = currentOrderContext();
    syncImagingLinesFromDom();
    const items = state.doctor.imagingLines
      .map((line) => ({
        imagingType: line.imagingType,
        bodyPart: line.bodyPart.trim(),
        priority: line.priority,
        transport: line.transport,
        indication: line.indication.trim() || "Not specified"
      }))
      .filter((line) => line.bodyPart || line.indication !== "Not specified");
    if (!items.length || items.some((line) => !line.bodyPart)) {
      notify("Please key in body part for each imaging request.");
      return render();
    }
    const draft = {
      id: `IMG-${Date.now()}`,
      queueNo: queue.no,
      patient: queue.patient,
      mrn: queue.mrn,
      doctor: queue.doctor,
      items,
      imagingType: items.map((item) => item.imagingType).join(", "),
      bodyPart: items.map((item) => item.bodyPart).join(", "),
      status: "Draft saved"
    };
    state.doctor.imagingDraft = draft;
    state.doctor.imagingPendingConfirm = draft;
    state.modal = { type: "confirm-imaging" };
    addAudit("imaging.request.draft.saved", queue.doctor, queue.no, `${items.length} imaging request(s) saved as draft`);
    notify("Imaging request draft saved. Please confirm nurse notification.");
    return render();
  }
  if (action === "confirm-send-imaging-nurse") {
    const draft = state.doctor.imagingPendingConfirm;
    if (!draft) {
      notify("No imaging draft to send.");
      return render();
    }
    state.nurseProcessQueue.unshift({
      ...draft,
      testName: draft.items.map((item) => `${item.imagingType} ${item.bodyPart}`).join("; "),
      status: "Waiting nurse imaging preparation"
    });
    draft.items.forEach((item, index) => {
      state.nurseTasks.unshift({
        id: `img-${Date.now()}-${index}`,
        task: `Imaging preparation - ${item.imagingType} ${item.bodyPart}`,
        patient: draft.patient,
        bed: draft.queueNo,
        due: item.priority === "STAT" ? "Due now" : "30m",
        control: `${item.transport}; prepare patient for imaging`,
        status: "Pending",
        priority: item.priority === "Routine" ? "normal" : "urgent"
      });
    });
    state.doctor.imagingPendingConfirm = null;
    state.modal = null;
    addAudit("imaging.request.sent.nurse", draft.doctor, draft.queueNo, `${draft.items.length} imaging request(s) nurse notified`);
    notify(`Imaging request notification sent to nurse for ${draft.queueNo}.`);
    return render();
  }
  if (action === "add-historical-med") {
    const input = document.getElementById("historicalMedicationInput");
    const raw = input?.value?.trim();
    if (!raw) {
      notify("Please enter a historical medication first.");
      return render();
    }
    state.historicalMedication.unshift({
      name: raw,
      dose: "",
      frequency: "Patient-entered",
      source: "New patient history",
      status: "Unverified"
    });
    state.patientHistory.unshift({
      date: new Date().toISOString().slice(0, 10),
      type: "Medication History",
      title: raw,
      detail: "Historical medication keyed in for reconciliation."
    });
    addAudit("historical.medication.added", "Dr. Rahman", state.selectedPatient.mrn, raw);
    notify("Historical medication added.");
  }
  if (action === "send-prescription") {
    state.doctor.prescriptionLines = [
      { medication: "", dose: "", frequency: "", duration: "", instructions: "" }
    ];
    state.modal = { type: "prescription" };
    return render();
  }
  if (action === "add-rx-line") {
    syncPrescriptionLinesFromDom();
    state.doctor.prescriptionLines.push({ medication: "", dose: "", frequency: "", duration: "", instructions: "" });
    return render();
  }
  if (action === "remove-rx-line") {
    syncPrescriptionLinesFromDom();
    const index = Number(data.index);
    if (state.doctor.prescriptionLines.length > 1) {
      state.doctor.prescriptionLines.splice(index, 1);
    }
    return render();
  }
  if (action === "save-prescription-draft") {
    const queue = currentOrderContext();
    syncPrescriptionLinesFromDom();
    const items = state.doctor.prescriptionLines
      .map((line) => ({
        medication: line.medication.trim(),
        dose: line.dose.trim(),
        frequency: line.frequency.trim(),
        duration: line.duration.trim() || "As directed",
        instructions: line.instructions.trim() || "No special instructions"
      }))
      .filter((line) => line.medication || line.dose || line.frequency);
    const invalid = items.find((line) => !line.medication || !line.dose || !line.frequency);
    if (!items.length || invalid) {
      notify("Please key in medication, dose, and frequency for each medication.");
      return render();
    }
    const draft = {
      id: `RX-${Date.now()}`,
      queueNo: queue.no,
      patient: queue.patient,
      mrn: queue.mrn,
      doctor: queue.doctor,
      items,
      medication: items.map((item) => item.medication).join(", "),
      status: "Draft saved"
    };
    state.doctor.prescriptionDraft = draft;
    state.doctor.prescriptionPendingConfirm = draft;
    state.modal = { type: "confirm-prescription" };
    addAudit("prescription.draft.saved", queue.doctor, queue.no, `${items.length} medication(s) saved as draft`);
    notify("Prescription draft saved. Please confirm send.");
    return render();
  }
  if (action === "confirm-send-pharmacy") {
    const draft = state.doctor.prescriptionPendingConfirm;
    if (!draft) {
      notify("No prescription draft to send.");
      return render();
    }
    state.pharmacyQueue.unshift({
      ...draft,
      medication: draft.items.map((item) => `${item.medication} ${item.dose}`).join("; "),
      status: "Waiting pharmacy collection"
    });
    draft.items.forEach((item, index) => {
      state.medication.unshift({
        id: `m-${Date.now()}-${index}`,
        name: item.medication,
        status: "Verify",
        preparedBy: state.clinicAdmin.medicationFlow.preparedBy,
        signedOffBy: state.clinicAdmin.medicationFlow.signedOffBy,
        handoverToPatientBy: state.clinicAdmin.medicationFlow.handoverToPatientBy,
        validation: `${item.dose}, ${item.frequency}; from ${draft.queueNo}; pharmacy verification required`
      });
    });
    state.doctor.prescriptionSent = true;
    state.doctor.prescriptionPendingConfirm = null;
    state.modal = null;
    addAudit("prescription.sent.pharmacy", draft.doctor, draft.queueNo, `${draft.items.length} medication(s) sent to pharmacy collection queue`);
    notify(`Prescription sent to pharmacy for ${draft.queueNo}.`);
    return render();
  }
  if (action === "schedule-followup") {
    state.doctor.followUp = document.getElementById("followUpDate")?.value || "";
    addAudit("followup.scheduled", "Dr. Ong", state.selectedPatient.mrn, `Follow-up date ${state.doctor.followUp || "not selected"}`);
    notify("Follow-up saved.");
  }
  if (action === "complete-task") {
    const task = state.nurseTasks.find((t) => t.id === data.id);
    if (task) {
      task.status = "Completed";
      task.control = "Completed with patient scan";
      addAudit("nursing.task.completed", "ICU Nurse", task.bed, task.task);
      notify("Nursing task completed.");
    }
  }
  if (action === "save-vitals") {
    addAudit("vitals.recorded", "ICU Nurse", "B09", `NEWS2 score ${scoreNews2(state.vitals)}`);
    notify("Vitals saved and NEWS2 recalculated.");
  }
  if (action === "save-nurse-check") {
    saveNurseCheckFromFields("");
    return render();
  }
  if (action === "save-nurse-check-modal") {
    saveNurseCheckFromFields("modal");
    state.modal = null;
    return render();
  }
  if (action === "save-handover") {
    state.modal = null;
    state.handoverSaved = true;
    addAudit("handover.saved", "ICU Nurse", "Ward B", "Pending task list included");
    notify("Shift handover saved.");
  }
  if (action === "capture-consent") {
    state.modal = null;
    state.pediatric.guardianConsent = true;
    addAudit("guardian.consent.captured", "Nurse Hana", "MRN-10294", "Guardian consent captured");
    notify("Guardian consent captured.");
  }
  if (action === "check-dose") {
    state.pediatric.weightKg = Number(document.getElementById("pediatricWeight")?.value || state.pediatric.weightKg);
    state.pediatric.temp = Number(document.getElementById("pediatricTemp")?.value || state.pediatric.temp);
    state.pediatric.doseChecked = true;
    addAudit("pediatric.dose.checked", "Pharmacist Lee", "MRN-10294", `Weight ${state.pediatric.weightKg} kg verified`);
    notify("Pediatric dose check completed.");
  }
  if (action === "ack-vaccine") {
    state.pediatric.vaccinationAck = true;
    addAudit("vaccination.alert.ack", "Nurse Hana", "MRN-10294", "Guardian notified of due vaccination");
    notify("Vaccination alert acknowledged.");
  }
  if (action === "save-icu") {
    state.icu.spo2 = Number(document.getElementById("icuSpo2")?.value || state.icu.spo2);
    state.icu.sbp = Number(document.getElementById("icuSbp")?.value || state.icu.sbp);
    state.icu.dbp = Number(document.getElementById("icuDbp")?.value || state.icu.dbp);
    state.icu.temp = Number(document.getElementById("icuTemp")?.value || state.icu.temp);
    state.icu.intake = Number(document.getElementById("icuIntake")?.value || state.icu.intake);
    state.icu.output = Number(document.getElementById("icuOutput")?.value || state.icu.output);
    addAudit("icu.observation.saved", "ICU Nurse", "ICU-03", `SpO2 ${state.icu.spo2}%, fluid ${state.icu.intake - state.icu.output} ml`);
    notify("ICU hourly observation saved.");
  }
  if (action === "icu-escalate") {
    state.modal = null;
    addAudit("critical.alert.escalated", "ICU Nurse", "ICU-03", "Doctor and nurse notified");
    notify("Critical alert escalated.");
  }
  if (action === "request-transfer") {
    state.icu.transferRequested = true;
    addAudit("icu.transfer.requested", "ICU Nurse", "MRN-09331", "Awaiting doctor approval");
    notify("ICU transfer approval requested.");
  }
  if (action === "assign-bed") {
    state.modal = null;
    const available = state.beds.find((b) => b.id === "P2-12");
    if (available && available.status === "Available") {
      available.status = "Occupied";
      available.patient = state.selectedPatient.name;
      available.detail = state.selectedPatient.diagnosis;
      available.flag = "Assigned";
      state.selectedPatient.bed = available.id;
      addAudit("bed.assigned", "Bed Manager", available.id, `${state.selectedPatient.name} assigned`);
      notify("Patient assigned to P2-12.");
    } else {
      notify("P2-12 is no longer available.");
    }
  }
  if (action === "verify-med") {
    const med = state.medication.find((m) => m.id === data.id);
    if (med && med.status !== "Blocked") {
      med.status = "Ready";
      med.validation = "Pharmacy verification passed";
      addAudit("medication.verified", "Pharmacist Lee", med.name, "Verification passed");
      notify(`${med.name} verified.`);
    } else {
      addAudit("medication.blocked", "Pharmacist Lee", med?.name || "Medication", "Allergy conflict remains blocked");
      notify("Medication remains blocked by safety rule.");
    }
  }
  if (action === "verify-all-meds") {
    state.modal = null;
    state.medication.forEach((m) => {
      if (m.status === "Verify") {
        m.status = "Ready";
        m.validation = "Pharmacy verification passed";
      }
    });
    addAudit("medication.batch.verified", "Pharmacist Lee", "Prescription queue", "Eligible medicines verified");
    notify("Eligible medicines verified.");
  }
  if (action === "administer-med") {
    const med = state.medication.find((m) => m.id === data.id);
    addAudit("medication.administered", "ICU Nurse", med?.name || "Medication", "Patient wristband scan confirmed");
    notify("Medication administered with scan.");
  }
  if (action === "request-stock") {
    state.inventory[0].qty += 20;
    state.inventory[0].status = "Replenished";
    addAudit("stock.request.approved", "Pharmacist Lee", "Normal saline 500ml", "Quantity increased by 20");
    notify("Stock request approved.");
  }
  if (action === "stock-in-medication") {
    const item = state.inventory[Number(data.id ?? selectedPharmacyStockIndex())];
    if (item) {
      const location = document.getElementById("pharmacyLocationSelect")?.value || item.department;
      item.qty += 10;
      item.department = location;
      item.status = "Stock in";
      addAudit("medication.stock.in", "Pharmacist Lee", item.item, `Quantity now ${item.qty} at ${location}`);
      notify(`${item.item} stocked in. Qty now ${item.qty}.`);
    }
  }
  if (action === "stock-out-medication") {
    const item = state.inventory[Number(data.id ?? selectedPharmacyStockIndex())];
    if (item && item.qty > 0) {
      item.qty -= 1;
      item.status = item.qty < 10 ? "Low stock alert" : "Issued";
      addAudit("medication.stock.out", "Pharmacist Lee", item.item, `Quantity now ${item.qty}`);
      notify(`${item.item} issued. Qty now ${item.qty}.`);
    }
  }
  if (action === "dispose-medication-stock") {
    const item = state.inventory[Number(data.id ?? selectedPharmacyStockIndex())];
    if (item) {
      item.status = "Disposed";
      addAudit("medication.stock.disposed", "Pharmacist Lee", item.item, `Batch ${item.batch}, expiry ${item.expiry}, supplier ${item.supplier}`);
      notify(`${item.item} marked as disposed.`);
    }
  }
  if (action === "call-prescription-queue") {
    const queueNo = data.queue || "Queue";
    const liveQueue = state.pharmacyQueue.find((queue) => queue.queueNo === queueNo);
    if (liveQueue) liveQueue.status = "Called for collection";
    addAudit("pharmacy.queue.called", "Pharmacist Lee", queueNo, "Medication collection number called");
    notify(`${queueNo} called for medication collection.`);
  }
  if (action === "issue-stock") {
    const item = state.inventory[Number(data.id)];
    if (item && item.qty > 0) {
      item.qty -= 1;
      item.status = item.qty < 10 ? "Low stock alert" : "Issued";
      addAudit("stock.issued", "Pharmacist Lee", item.item, `Quantity now ${item.qty}`);
      notify("Stock issued.");
    }
  }
  if (action === "assign-asset") {
    const asset = state.assets.find((a) => a.id === data.id);
    if (asset) {
      asset.assignment = state.selectedPatient.bed;
      asset.status = "Assigned to selected patient";
      addAudit("asset.assigned", "Biomedical Team", asset.name, `Assigned to ${state.selectedPatient.bed}`);
      notify("Asset assigned.");
    }
  }
  if (action === "open-asset-detail") {
    state.modal = { type: "asset-detail", assetId: data.id };
    const asset = state.assets.find((item) => item.id === data.id);
    addAudit("asset.detail.opened", "Asset Officer", asset?.name || data.id, "Asset detail screen opened");
    return render();
  }
  if (action === "asset-detail-relocate" || action === "asset-detail-reassign" || action === "asset-detail-dispose" || action === "asset-detail-malfunction") {
    const asset = state.assets.find((item) => item.id === state.modal?.assetId);
    if (asset) {
      if (action === "asset-detail-relocate") {
        const location = document.getElementById("assetDetailLocation")?.value || "Store Room 1";
        asset.assignment = location;
        asset.status = location.includes("Store Room") ? "Stored" : "Relocated";
        addAudit("asset.relocated", "Asset Officer", asset.name, `Relocated to ${location}`);
        notify(`${asset.name} relocated to ${location}.`);
      }
      if (action === "asset-detail-reassign") {
        const target = document.getElementById("assetDetailAssign")?.value?.trim() || state.selectedPatient.bed;
        asset.assignment = target;
        asset.status = "Reassigned";
        addAudit("asset.reassigned", "Asset Officer", asset.name, `Reassigned to ${target}`);
        notify(`${asset.name} reassigned to ${target}.`);
      }
      if (action === "asset-detail-dispose") {
        asset.status = "Disposed";
        asset.assignment = "Disposed / removed from use";
        addAudit("asset.disposed", "Asset Officer", asset.name, `${asset.supplier}, purchased ${asset.purchaseDate}, cost ${asset.cost}`);
        notify(`${asset.name} disposed.`);
      }
      if (action === "asset-detail-malfunction") {
        asset.status = "Malfunction reported";
        asset.assignment = "Biomedical / Maintenance";
        addAudit("asset.malfunction.reported", "Asset Officer", asset.name, `${asset.supplier}, purchased ${asset.purchaseDate}, cost ${asset.cost}`);
        notify(`${asset.name} malfunction reported.`);
      }
    }
    state.modal = null;
    return render();
  }
  if (action === "save-new-asset") {
    const name = document.getElementById("newAssetName")?.value?.trim();
    const assignment = document.getElementById("newAssetLocation")?.value || "Store Room 1";
    const supplier = document.getElementById("newAssetSupplier")?.value?.trim() || "Not specified";
    const purchaseDate = document.getElementById("newAssetPurchaseDate")?.value || new Date().toISOString().slice(0, 10);
    const cost = document.getElementById("newAssetCost")?.value?.trim() || "RM 0.00";
    const status = document.getElementById("newAssetStatus")?.value || "Stored";
    if (!name) {
      notify("Please enter asset name.");
      return render();
    }
    state.assets.unshift({
      id: `a-${Date.now()}`,
      name,
      assignment,
      status,
      purchaseDate,
      supplier,
      cost
    });
    state.modal = null;
    addAudit("asset.created", "Asset Officer", name, `${supplier}, ${purchaseDate}, ${cost}, ${assignment}`);
    notify(`${name} added to fixed assets.`);
    return render();
  }
  if (action === "dispose-asset") {
    const asset = state.assets.find((a) => a.id === data.id);
    if (asset) {
      asset.status = "Disposed";
      asset.assignment = "Disposed / removed from use";
      addAudit("asset.disposed", "Asset Officer", asset.name, `${asset.supplier}, purchased ${asset.purchaseDate}, cost ${asset.cost}`);
      notify(`${asset.name} disposed.`);
    }
    return render();
  }
  if (action === "relocate-asset-quick") {
    const asset = state.assets.find((item) => item.id === document.getElementById("assetQuickSelect")?.value);
    const location = document.getElementById("assetLocationSelect")?.value || "Store Room 1";
    if (asset) {
      asset.assignment = location;
      asset.status = location.includes("Store Room") ? "Stored" : "Relocated";
      addAudit("asset.relocated", "Asset Officer", asset.name, `Relocated to ${location}`);
      notify(`${asset.name} relocated to ${location}.`);
    }
    return render();
  }
  if (action === "report-asset-malfunction") {
    const asset = state.assets.find((item) => item.id === document.getElementById("assetQuickSelect")?.value);
    if (asset) {
      asset.status = "Malfunction reported";
      asset.assignment = "Biomedical / Maintenance";
      addAudit("asset.malfunction.reported", "Ward User", asset.name, `${asset.supplier}, purchased ${asset.purchaseDate}, cost ${asset.cost}`);
      notify(`${asset.name} malfunction reported.`);
    }
    return render();
  }
  if (action === "breakdown") {
    const asset = state.assets.find((a) => a.id === data.id);
    if (asset) {
      asset.status = "Biomedical ticket opened";
      addAudit("asset.breakdown.created", "Ward Nurse", asset.name, "Biomedical team notified");
      notify("Biomedical ticket created.");
    }
  }
  if (action === "calibration-check") {
    addAudit("asset.calibration.checked", "Biomedical Team", "All assets", "Calibration check completed");
    notify("Calibration check completed.");
  }
  if (action === "upload-report") {
    state.modal = null;
    const id = `r${state.reports.length + 1}`;
    state.reports.unshift({ id, name: "uploaded-report.pdf", link: `${state.selectedPatient.mrn} / NEW-ENC`, status: "Doctor review pending" });
    addAudit("report.uploaded", "Current User", state.selectedPatient.mrn, "uploaded-report.pdf linked to encounter");
    notify("Report uploaded.");
  }
  if (action === "review-report") {
    const report = state.reports.find((r) => r.id === data.id);
    if (report) {
      report.status = "Reviewed";
      addAudit("report.reviewed", "Dr. Sarah", report.name, "Marked reviewed");
      notify("Report marked reviewed.");
    }
  }
  if (action === "download-report") {
    const report = state.reports.find((r) => r.id === data.id);
    addAudit("report.downloaded", "Current User", report?.name || "Report", "Download logged");
    notify("Report download logged.");
  }
  if (action === "export-audit") {
    notify("Audit summary prepared in the event log.");
    addAudit("audit.exported", "Auditor", "Audit Trail", "Export summary generated");
  }
  render();
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

document.getElementById("patientSearch").addEventListener("input", (event) => {
  state.query = event.target.value;
  if (state.view !== "doctor") setView("doctor");
  else render();
});

document.getElementById("notifyButton").addEventListener("click", () => setView("audit"));

render();
