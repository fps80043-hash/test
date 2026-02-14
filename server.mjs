import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, "dist");
const port = Number(process.env.PORT || 3000);
const host = "0.0.0.0";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function safeDecode(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = safeDecode(url.pathname);

  // Health endpoints (Railway-friendly)
  if (pathname === "/health" || pathname === "/_health") {
    return send(res, 200, "ok", { "Content-Type": "text/plain; charset=utf-8" });
  }

  // If dist is missing, show a helpful message
  if (!fs.existsSync(distDir)) {
    return send(
      res,
      500,
      "dist/ not found. Did you run `npm run build`?\n",
      { "Content-Type": "text/plain; charset=utf-8" }
    );
  }

  let filePath = path.join(distDir, pathname);

  // Directory -> index.html
  if (filePath.endsWith(path.sep)) filePath += "index.html";

  // If file doesn't exist, SPA fallback to index.html
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, "index.html");
  }

  try {
    const ext = path.extname(filePath).toLowerCase();
    const data = fs.readFileSync(filePath);
    send(res, 200, data, { "Content-Type": mime[ext] || "application/octet-stream" });
  } catch {
    send(res, 500, "Server error\n", { "Content-Type": "text/plain; charset=utf-8" });
  }
});

server.listen(port, host, () => {
  console.log(`Listening on http://${host}:${port}`);
});
