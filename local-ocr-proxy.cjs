const http = require("http");
const https = require("https");
const { URL } = require("url");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

const host = "127.0.0.1";
const port = Number(process.env.OCR_PROXY_PORT || 5050);
const upstreamBase = process.env.OCR_UPSTREAM_BASE || "http://45.64.170.8:8001";
const pendingDownloads = new Map();
const root = __dirname;
const glExtractor = path.join(root, "gl_extractor.py");
const pythonDeps = path.join(root, ".python-deps-clean");
const bundledPython = path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "python", "python.exe");
const pythonExe = process.env.PYTHON || (fs.existsSync(bundledPython) ? bundledPython : "python");

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition,Content-Type");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function requestBuffer(target, options = {}, body) {
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
    });
    req.on("error", reject);
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

async function handleConvert(req, res, reqUrl) {
  const body = await readBody(req);
  const filename = reqUrl.searchParams.get("filename") || "upload.pdf";
  const canLocal = process.env.TAXFLOW_LOCAL_GL !== "0" && /\.pdf$/i.test(filename);
  if (canLocal) {
    try {
      const local = await runLocalGlExtractor(body, filename);
      const stem = path.basename(filename, path.extname(filename)).replace(/\s+/g, "_");
      const excelName = `${stem || "general-ledger"}_extracted.xlsx`;
      const excelUrl = localBufferDownloadUrl(local.excel, excelName, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      const pdfUrl = localBufferDownloadUrl(body, filename, req.headers["content-type"] || "application/pdf");
      cors(res);
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
        cors(res);
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
    reqUrl.searchParams.get("filename") || "upload.pdf",
    req.headers["content-type"] || "application/pdf"
  );
  console.log(`[convert] ${body.length} bytes -> multipart file="${reqUrl.searchParams.get("filename") || "upload.pdf"}" (${multipart.body.length} bytes)`);

  const upstreamResponse = await requestBuffer(upstream.toString(), {
    method: "POST",
    headers: {
      "Authorization": req.headers.authorization || "",
      "Content-Type": multipart.contentType,
      "Content-Length": multipart.body.length,
    },
  }, multipart.body);

  const contentType = String(upstreamResponse.headers["content-type"] || "");
  cors(res);
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
    cors(res);
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
  cors(res);
  res.statusCode = upstreamResponse.statusCode;
  res.setHeader("Content-Type", upstreamResponse.headers["content-type"] || "application/octet-stream");
  if (upstreamResponse.headers["content-disposition"]) {
    res.setHeader("Content-Disposition", upstreamResponse.headers["content-disposition"]);
  }
  res.end(upstreamResponse.body);
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url || "/", `http://${host}:${port}`);
  try {
    if (req.method === "GET" && reqUrl.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, upstreamBase, localGlExtractor: fs.existsSync(glExtractor), pythonExe }));
      return;
    }
    if (req.method === "POST" && reqUrl.pathname === "/convert") {
      await handleConvert(req, res, reqUrl);
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
  console.log(`Local GL extractor ${fs.existsSync(glExtractor) ? "enabled" : "not found"} (${pythonExe})`);
});
