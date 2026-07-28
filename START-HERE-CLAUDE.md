# Start Here For Claude

1. Read `CLAUDE.md`.
2. Read `README.md`.
3. Read `TAXFLOW_MODULE_ARCHITECTURE_20260723.md`.
4. Inspect `taxflow_v5.html` before changing code.
5. Run the app locally:

```powershell
npm install
npm run start
```

6. In another terminal, run:

```powershell
npm run ocr-proxy
```

7. Test:

```text
http://127.0.0.1:5174/taxflow_v5.html
http://127.0.0.1:5050/health
```

Do not use `git add .` unless the user explicitly confirms all untracked local artifacts should be published.

