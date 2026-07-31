const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const host = "127.0.0.1";
const port = Number(process.argv[2] || process.env.MEDICORE_PORT || 5174);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function safeFilePath(urlPath) {
  const parsed = new URL(urlPath, `http://${host}:${port}`);
  const pathname = parsed.pathname === "/" ? "/index.html" : decodeURIComponent(parsed.pathname);
  const filePath = path.normalize(path.join(root, pathname));
  return filePath.startsWith(root) ? filePath : null;
}

const server = http.createServer((req, res) => {
  const filePath = safeFilePath(req.url || "/");
  if (!filePath) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(error.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain; charset=utf-8" });
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
  console.log(`MediCore HMS preview running at http://${host}:${port}/index.html`);
});
