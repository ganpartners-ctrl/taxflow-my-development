# MediCore HMS UI Upgrade Notes

## What was upgraded

- Added a runnable standalone UI artifact at `index.html`.
- Added `src/app.js` for interactive module switching, patient search, patient selection, notifications routing, and dynamic dashboards.
- Reworked `src/styles.css` into an operational hospital interface with responsive desktop/tablet/mobile layouts.
- Preserved Claude's handoff bundle under `claude-handoff/` for traceability.
- Removed the dependency requirement for the prototype UI. It opens directly in a browser and does not require `npm install`.

## Screens included

- Command Center
- Doctor Clinic
- Nurse Ward
- Pediatric Ward
- ICU Ward
- Visual Bed Board
- Medication Harness
- Department Inventory
- Asset Control
- Report Upload
- Audit Trail

## Harness concepts represented

- Shared patient record
- RBAC + department + patient assignment access model
- Pediatric guardian/consent and weight-based medication checks
- ICU ventilator, oxygen, infusion, fluid balance, and critical alerts
- Bed hierarchy and status controls
- Medication safety gates
- Inventory, asset, report, audit, analytics, and AI-assist readiness

## How to open

Open `index.html` directly in a browser, or serve the folder locally:

```powershell
python -m http.server 8087 --bind 127.0.0.1
```

Then visit:

```text
http://127.0.0.1:8087/index.html
```
