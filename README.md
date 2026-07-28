# TaxFlow MY Development

Local development handoff for the TaxFlow MY prototype.

## Quick Start

1. Install Node.js.
2. From this folder, run:

```powershell
npm install
node preview-server.cjs
```

3. In a second terminal, run the OCR proxy when ledger extraction is needed:

```powershell
node local-ocr-proxy.cjs
```

4. Open:

```text
http://127.0.0.1:5174/taxflow_v5.html
```

## Main Files

- `taxflow_v5.html` - current TaxFlow MY UI and client-side workflow.
- `local-ocr-proxy.cjs` - local proxy for OCR/API calls.
- `gl_extractor.py` - local general-ledger extraction helper.
- `preview-server.cjs` - local static/dev server.
- `CLAUDE.md` - Claude handoff notes and current development priorities.
- `START-HERE-CLAUDE.md` - short setup checklist for continuing in Claude.
- `.codex/skills/tax-return-prefill-engine/SKILL.md` - project-specific extraction/prefill workflow notes.

Client PDFs, Excel files, handoff archives, logs, browser profiles, and dependency caches are intentionally excluded from Git.
