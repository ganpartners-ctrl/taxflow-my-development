const http = require("http");
const https = require("https");
const { URL } = require("url");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn, execFileSync } = require("child_process");

const host = "127.0.0.1";
const port = Number(process.env.OCR_PROXY_PORT || 5050);
const upstreamBase = process.env.OCR_UPSTREAM_BASE || "http://45.64.170.8:8001";
const pendingDownloads = new Map();
const root = __dirname;
const glExtractor = path.join(root, "gl_extractor.py");
const caScheduleExtractor = path.join(root, "ca_schedule_extractor.py");
const pythonDeps = path.join(root, ".python-deps-clean");
const bundledPython = path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "python", "python.exe");

// There can be more than one Python install on a machine (a bundled runtime
// from another tool, the Microsoft Store version, a python.org install,
// etc), each with its own separate set of pip-installed packages. Picking
// the wrong one silently breaks local extraction -- it "runs" but fails to
// import pdfplumber/openpyxl, so every conversion falls back to the slower
// remote API. Rather than guess a single path, actually test each
// candidate at startup and use the first one that can import what's needed.
function resolvePythonExe() {
  const candidates = [];
  if (process.env.PYTHON) candidates.push(process.env.PYTHON);
  candidates.push("python", "py", "python3");
  if (fs.existsSync(bundledPython)) candidates.push(bundledPython);
  const checked = [];
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ["-c", "import pdfplumber, openpyxl"], { stdio: "pipe", timeout: 8000 });
      return { exe: candidate, ok: true, checked };
    } catch (error) {
      checked.push({ candidate, error: (error.stderr || error.message || "").toString().split("\n")[0] });
    }
  }
  // Nothing worked -- fall back to "python" so error messages are at least
  // familiar, but local extraction will be unavailable until this is fixed.
  return { exe: "python", ok: false, checked };
}
const pythonResolution = resolvePythonExe();
const pythonExe = pythonResolution.exe;

function cors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition,Content-Type");
  // Chrome's Private Network Access policy blocks a page from fetching a
  // localhost/private-network target (like this proxy on 127.0.0.1) unless
  // the preflight response explicitly allows it. Without this, requests can
  // fail with a CORS-shaped error even though the rest of the CORS config is
  // otherwise correct -- easy to miss since it only affects newer Chrome.
  if (req && req.headers["access-control-request-private-network"] === "true") {
    res.setHeader("Access-Control-Allow-Private-Network", "true");
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function requestBuffer(target, options = {}, body, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const url = new URL(target);
    const client = url.protocol === "https:" ? https : http;
    const req = client.request(url, options, res => {
      const chunks = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("end", () => resolve({
        statusCode: res.statusCode || 502,
        headers: res.headers,
        body: Buffer.concat(chunks),
      }));
      res.on("error", reject);
    });
    req.on("error", reject);
    // Without this, an unreachable or silently-hanging upstream server left
    // this Promise pending forever -- no error, no timeout, nothing -- which
    // shows up to the user as the app just hanging indefinitely on upload.
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Upstream request to ${url.origin} timed out after ${Math.round(timeoutMs / 1000)}s -- the server may be down or unreachable from this network.`));
    });
    if (body) req.write(body);
    req.end();
  });
}

function multipartFileBody(fileBuffer, filename, contentType) {
  const boundary = "----taxflow-ocr-" + Date.now().toString(16) + Math.random().toString(16).slice(2);
  const header = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${String(filename || "upload.pdf").replace(/"/g, "")}"\r\n` +
    `Content-Type: ${contentType || "application/pdf"}\r\n\r\n`,
    "utf8"
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  return {
    body: Buffer.concat([header, fileBuffer, footer]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

function cleanUploadedFilename(name) {
  return String(name || "upload.pdf")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim() || "upload.pdf";
}

function extractMultipartFileBody(rawBody, contentType, fallbackFilename) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(String(contentType || ""));
  if (!match) return null;
  const boundary = Buffer.from(`--${match[1] || match[2]}`, "utf8");
  let cursor = 0;
  while (cursor < rawBody.length) {
    const partStart = rawBody.indexOf(boundary, cursor);
    if (partStart < 0) break;
    const headerStart = partStart + boundary.length;
    if (rawBody.slice(headerStart, headerStart + 2).toString() === "--") break;
    const headerEnd = rawBody.indexOf(Buffer.from("\r\n\r\n"), headerStart);
    if (headerEnd < 0) break;
    const headerText = rawBody.slice(headerStart, headerEnd).toString("latin1");
    const dataStart = headerEnd + 4;
    const nextBoundary = rawBody.indexOf(boundary, dataStart);
    if (nextBoundary < 0) break;
    let dataEnd = nextBoundary;
    if (rawBody[dataEnd - 2] === 13 && rawBody[dataEnd - 1] === 10) dataEnd -= 2;
    const disposition = /content-disposition:[^\r\n]*/i.exec(headerText)?.[0] || "";
    if (/name="file"/i.test(disposition)) {
      const filename = /filename="([^"]*)"/i.exec(disposition)?.[1] || fallbackFilename;
      const fileType = /content-type:\s*([^\r\n]+)/i.exec(headerText)?.[1]?.trim() || "application/pdf";
      return {
        buffer: rawBody.slice(dataStart, dataEnd),
        filename: cleanUploadedFilename(filename),
        contentType: fileType,
      };
    }
    cursor = nextBoundary + boundary.length;
  }
  return null;
}

function requestUploadFile(rawBody, headers, fallbackFilename) {
  const contentType = headers["content-type"] || "";
  const multipart = extractMultipartFileBody(rawBody, contentType, fallbackFilename);
  if (multipart) return multipart;
  return {
    buffer: rawBody,
    filename: cleanUploadedFilename(fallbackFilename),
    contentType: contentType || "application/pdf",
  };
}

function localDownloadUrl(remoteUrl, authorization) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
  pendingDownloads.set(id, {
    authorization,
    remoteUrl,
    createdAt: Date.now(),
  });
  return `http://${host}:${port}/download?id=${encodeURIComponent(id)}`;
}

function localBufferDownloadUrl(buffer, filename, contentType) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
  pendingDownloads.set(id, { buffer, filename, contentType, createdAt: Date.now() });
  return `http://${host}:${port}/download?id=${encodeURIComponent(id)}`;
}

function runLocalGlExtractor(fileBuffer, filename) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(glExtractor)) return reject(new Error("gl_extractor.py not found"));
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "taxflow-gl-"));
    const pdfPath = path.join(tempDir, String(filename || "upload.pdf").replace(/[\\/:*?"<>|]/g, "_"));
    const outPath = path.join(tempDir, "general-ledger-extracted.xlsx");
    fs.writeFileSync(pdfPath, fileBuffer);
    const env = { ...process.env };
    if (fs.existsSync(pythonDeps)) env.PYTHONPATH = env.PYTHONPATH ? `${pythonDeps}${path.delimiter}${env.PYTHONPATH}` : pythonDeps;
    env.PYTHONIOENCODING = env.PYTHONIOENCODING || "utf-8";
    const child = spawn(pythonExe, [glExtractor, pdfPath, outPath], { cwd: root, windowsHide: true, env });
    let stdout = "", stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Local GL extractor timed out"));
    }, 180000);
    child.stdout.on("data", chunk => stdout += chunk.toString());
    child.stderr.on("data", chunk => stderr += chunk.toString());
    child.on("error", error => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", code => {
      clearTimeout(timer);
      try {
        if (code !== 0) throw new Error((stderr || stdout || `Local GL extractor exited ${code}`).trim());
        if (!fs.existsSync(outPath)) throw new Error("Local GL extractor did not create Excel output");
        const excel = fs.readFileSync(outPath);
        fs.rmSync(tempDir, { recursive: true, force: true });
        resolve({ excel, stdout });
      } catch (error) {
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
        reject(error);
      }
    });
  });
}

function runCaScheduleExtractor(fileBuffer, filename) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(caScheduleExtractor)) return reject(new Error("ca_schedule_extractor.py not found"));
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "taxflow-ca-"));
    const pdfPath = path.join(tempDir, String(filename || "upload.pdf").replace(/[\\/:*?"<>|]/g, "_"));
    const outPath = path.join(tempDir, "ca-schedule-extracted.json");
    fs.writeFileSync(pdfPath, fileBuffer);
    const env = { ...process.env };
    if (fs.existsSync(pythonDeps)) env.PYTHONPATH = env.PYTHONPATH ? `${pythonDeps}${path.delimiter}${env.PYTHONPATH}` : pythonDeps;
    env.PYTHONIOENCODING = env.PYTHONIOENCODING || "utf-8";
    const child = spawn(pythonExe, [caScheduleExtractor, pdfPath, outPath], { cwd: root, windowsHide: true, env });
    let stdout = "", stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("CA schedule extractor timed out"));
    }, 180000);
    child.stdout.on("data", chunk => stdout += chunk.toString());
    child.stderr.on("data", chunk => stderr += chunk.toString());
    child.on("error", error => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", code => {
      clearTimeout(timer);
      try {
        if (code !== 0) throw new Error((stderr || stdout || `CA schedule extractor exited ${code}`).trim());
        if (!fs.existsSync(outPath)) throw new Error("CA schedule extractor did not create JSON output");
        const json = fs.readFileSync(outPath, "utf8");
        fs.rmSync(tempDir, { recursive: true, force: true });
        resolve({ json, stdout });
      } catch (error) {
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
        reject(error);
      }
    });
  });
}

async function handleCaSchedule(req, res, reqUrl) {
  const rawBody = await readBody(req);
  const upload = requestUploadFile(rawBody, req.headers, reqUrl.searchParams.get("filename") || "upload.pdf");
  const body = upload.buffer;
  const filename = upload.filename;
  if (!/\.pdf$/i.test(filename)) {
    cors(req, res);
    res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: "CA schedule extraction requires a PDF file" }));
    return;
  }
  try {
    const result = await runCaScheduleExtractor(body, filename);
    cors(req, res);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    // result.json is already a JSON document produced by the python script;
    // pass it through directly rather than re-stringifying a parsed copy.
    res.end(result.json);
  } catch (error) {
    cors(req, res);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: error.message }));
  }
}


async function handleConvert(req, res, reqUrl) {
  const rawBody = await readBody(req);
  const upload = requestUploadFile(rawBody, req.headers, reqUrl.searchParams.get("filename") || "upload.pdf");
  const body = upload.buffer;
  const filename = upload.filename;
  const canLocal = process.env.TAXFLOW_LOCAL_GL !== "0" && /\.pdf$/i.test(filename);
  const wantsFile = reqUrl.searchParams.get("delivery") === "file";
  if (canLocal) {
    try {
      const local = await runLocalGlExtractor(body, filename);
      const stem = path.basename(filename, path.extname(filename)).replace(/\s+/g, "_");
      const excelName = `${stem || "general-ledger"}_extracted.xlsx`;
      if (wantsFile) {
        cors(req, res);
        res.writeHead(200, {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${excelName}"`,
        });
        res.end(local.excel);
        return;
      }
      const excelUrl = localBufferDownloadUrl(local.excel, excelName, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      const pdfUrl = localBufferDownloadUrl(body, filename, req.headers["content-type"] || "application/pdf");
      cors(req, res);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({
        ok: true,
        engine: "local-gl-extractor",
        excel_download_url: excelUrl,
        pdf_download_url: pdfUrl,
        document: { stem, pdf_filename: filename, excel_filename: excelName },
        log: local.stdout,
      }));
      return;
    } catch (error) {
      console.warn("[local-ocr-proxy] local GL extractor fallback:", error.message);
      if (reqUrl.searchParams.get("localOnly") === "1") {
        cors(req, res);
        res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, engine: "local-gl-extractor", error: error.message }));
        return;
      }
    }
  }
  const upstream = new URL("/convert", upstreamBase);
  for (const [key, value] of reqUrl.searchParams) upstream.searchParams.set(key, value);
  upstream.searchParams.delete("filename");

  const multipart = multipartFileBody(
    body,
    filename,
    upload.contentType || "application/pdf"
  );
  console.log(`[convert] ${body.length} bytes -> multipart file="${filename}" (${multipart.body.length} bytes)`);

  const upstreamResponse = await requestBuffer(upstream.toString(), {
    method: "POST",
    headers: {
      "Authorization": req.headers.authorization || "",
      "Content-Type": multipart.contentType,
      "Content-Length": multipart.body.length,
    },
  }, multipart.body, 180000);

  const contentType = String(upstreamResponse.headers["content-type"] || "");
  cors(req, res);
  res.statusCode = upstreamResponse.statusCode;

  if (contentType.includes("application/json")) {
    try {
      const payload = JSON.parse(upstreamResponse.body.toString("utf8"));
      for (const key of [
        "url",
        "link",
        "download_url",
        "file_url",
        "excel_download_url",
        "metadata_download_url",
        "pdf_download_url",
      ]) {
        if (payload[key] && /^https?:\/\//i.test(payload[key])) {
          payload[key] = localDownloadUrl(payload[key], req.headers.authorization || "");
        }
      }
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(payload));
      return;
    } catch {
      // Fall through and return the upstream body unchanged.
    }
  }

  res.setHeader("Content-Type", contentType || "application/octet-stream");
  res.end(upstreamResponse.body);
}

async function handleDownload(req, res, reqUrl) {
  const id = reqUrl.searchParams.get("id");
  const stored = id ? pendingDownloads.get(id) : null;
  if (stored?.buffer) {
    cors(req, res);
    res.statusCode = 200;
    res.setHeader("Content-Type", stored.contentType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${String(stored.filename || "download").replace(/"/g, "")}"`);
    res.end(stored.buffer);
    return;
  }
  const remote = stored?.remoteUrl || reqUrl.searchParams.get("url");
  if (!remote || !/^https?:\/\//i.test(remote)) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Missing or invalid download URL");
    return;
  }

  const authorization = stored?.authorization || req.headers.authorization || "";
  const upstreamResponse = await requestBuffer(remote, {
    method: "GET",
    headers: authorization ? { Authorization: authorization } : {},
  });
  cors(req, res);
  res.statusCode = upstreamResponse.statusCode;
  res.setHeader("Content-Type", upstreamResponse.headers["content-type"] || "application/octet-stream");
  if (upstreamResponse.headers["content-disposition"]) {
    res.setHeader("Content-Disposition", upstreamResponse.headers["content-disposition"]);
  }
  res.end(upstreamResponse.body);
}

const server = http.createServer(async (req, res) => {
  cors(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url || "/", `http://${host}:${port}`);
  try {
    if (req.method === "GET" && reqUrl.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, upstreamBase, localGlExtractor: fs.existsSync(glExtractor), caScheduleExtractor: fs.existsSync(caScheduleExtractor), pythonExe, pythonWorking: pythonResolution.ok, pythonChecked: pythonResolution.checked }));
      return;
    }
    if (req.method === "POST" && reqUrl.pathname === "/convert") {
      await handleConvert(req, res, reqUrl);
      return;
    }
    if (req.method === "POST" && reqUrl.pathname === "/api/ca-schedule") {
      await handleCaSchedule(req, res, reqUrl);
      return;
    }
    if (req.method === "GET" && reqUrl.pathname === "/download") {
      await handleDownload(req, res, reqUrl);
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  } catch (error) {
    console.error("[local-ocr-proxy]", error);
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: error.message }));
  }
});

server.listen(port, host, () => {
  console.log(`Local OCR proxy running at http://${host}:${port}`);
  console.log(`Forwarding OCR requests to ${upstreamBase}`);
  if (pythonResolution.ok) {
    console.log(`Local GL extractor ${fs.existsSync(glExtractor) ? "enabled" : "not found"} (python: ${pythonExe})`);
  } else {
    console.log(`Local GL extractor DISABLED -- no working Python found with pdfplumber+openpyxl installed.`);
    console.log(`  Tried: ${pythonResolution.checked.map(c => c.candidate).join(", ")}`);
    console.log(`  Every conversion will use the slower remote API instead. To fix: run`);
    console.log(`    python -m pip install pdfplumber openpyxl pypdf`);
    console.log(`  using the SAME "python" command shown above, then restart this proxy.`);
  }
});
