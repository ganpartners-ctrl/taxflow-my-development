const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

const root = __dirname;
const port = 5174;
const host = "127.0.0.1";
const upstreamBase = process.env.OCR_UPSTREAM_BASE || "http://45.64.170.8:8001";
const pendingDownloads = new Map();
const glExtractor = path.join(root, "gl_extractor.py");
const pythonDeps = path.join(root, ".python-deps-clean");
const bundledPython = path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "python", "python.exe");
const pythonExe = process.env.PYTHON || (fs.existsSync(bundledPython) ? bundledPython : "python");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf"
};

function safeFilePath(urlPath) {
  const parsed = new URL(urlPath, `http://${host}:${port}`);
  const pathname = decodeURIComponent(parsed.pathname === "/" ? "/index.html" : parsed.pathname);
  const filePath = path.normalize(path.join(root, pathname));
  return filePath.startsWith(root) ? filePath : null;
}

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
    const upstream = client.request(url, options, upstreamRes => {
      const chunks = [];
      upstreamRes.on("data", chunk => chunks.push(chunk));
      upstreamRes.on("end", () => resolve({
        statusCode: upstreamRes.statusCode || 502,
        headers: upstreamRes.headers,
        body: Buffer.concat(chunks),
      }));
    });
    upstream.on("error", reject);
    if (body) upstream.write(body);
    upstream.end();
  });
}

function multipartFileBody(fileBuffer, filename, contentType) {
  const boundary = "----taxflow-ocr-" + Date.now().toString(16) + Math.random().toString(16).slice(2);
  const safeName = String(filename || "upload.pdf").replace(/"/g, "");
  const header = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${safeName}"\r\n` +
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
  pendingDownloads.set(id, { authorization, remoteUrl, createdAt: Date.now() });
  return `http://${host}:${port}/api/download?id=${encodeURIComponent(id)}`;
}

function localBufferDownloadUrl(buffer, filename, contentType) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
  pendingDownloads.set(id, { buffer, filename, contentType, createdAt: Date.now() });
  return `http://${host}:${port}/api/download?id=${encodeURIComponent(id)}`;
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
      console.warn("[preview-server] local GL extractor fallback:", error.message);
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
  const upstreamResponse = await requestBuffer(upstream.toString(), {
    method: "POST",
    headers: {
      Authorization: req.headers.authorization || "",
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
      for (const key of ["url","link","download_url","file_url","excel_download_url","metadata_download_url","pdf_download_url"]) {
        if (payload[key] && /^https?:\/\//i.test(payload[key])) {
          payload[key] = localDownloadUrl(payload[key], req.headers.authorization || "");
        }
      }
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(payload));
      return;
    } catch {
      // Return upstream response below.
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
    cors(res);
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
    if (req.method === "GET" && reqUrl.pathname === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, upstreamBase, app: "TaxFlow local server", localGlExtractor: fs.existsSync(glExtractor), pythonExe }));
      return;
    }
    if (req.method === "POST" && reqUrl.pathname === "/api/convert") {
      await handleConvert(req, res, reqUrl);
      return;
    }
    if (req.method === "GET" && reqUrl.pathname === "/api/download") {
      await handleDownload(req, res, reqUrl);
      return;
    }
  } catch (error) {
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: error.message }));
    return;
  }

  const filePath = safeFilePath(req.url || "/");
  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(error.code === "ENOENT" ? 404 : 500);
      res.end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    res.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(content);
  });
});

server.listen(port, host, () => {
  console.log(`TaxFlow local app running at http://${host}:${port}/taxflow_v5.html`);
  console.log(`TaxFlow OCR proxy running at http://${host}:${port}/api`);
});
