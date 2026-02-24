const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const rootDir = process.cwd();
const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || "127.0.0.1";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function safeFilePath(requestPath) {
  const normalized = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  return path.join(rootDir, normalized);
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url || "/");
  let pathname = decodeURIComponent(parsed.pathname || "/");

  if (pathname === "/") {
    pathname = "/index.html";
  }

  const requested = safeFilePath(pathname);

  fs.stat(requested, (err, stats) => {
    if (!err && stats.isFile()) {
      serveFile(res, requested);
      return;
    }

    if (!err && stats.isDirectory()) {
      const indexPath = path.join(requested, "index.html");
      serveFile(res, indexPath);
      return;
    }

    serveFile(res, path.join(rootDir, "index.html"));
  });
});

server.listen(port, host, () => {
  console.log(`Dev server running at http://${host}:${port}`);
});
