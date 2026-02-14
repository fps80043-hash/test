import http from 'node:http';
import path from 'node:path';
import { promises as fs } from 'node:fs';

const PORT = Number.parseInt(process.env.PORT ?? '3000', 10);
const HOST = '0.0.0.0';
const DIST_DIR = path.join(process.cwd(), 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function safePathJoin(baseDir, urlPath) {
  // Prevent path traversal (..)
  const normalized = path
    .normalize(urlPath)
    .replace(/^([\\/]*\.\.[\\/])+/, '')
    .replace(/^\//, '');
  return path.join(baseDir, normalized);
}

async function fileExists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) {
      res.writeHead(400);
      res.end('Bad Request');
      return;
    }

    const requestUrl = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    const pathname = decodeURIComponent(requestUrl.pathname);

    // Map "/" -> "index.html"
    const mappedPath = pathname === '/' ? '/index.html' : pathname;
    const absolutePath = safePathJoin(DIST_DIR, mappedPath);

    // If the requested path exists and is a file, serve it.
    if (await fileExists(absolutePath)) {
      const ext = path.extname(absolutePath).toLowerCase();
      const data = await fs.readFile(absolutePath);
      res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream');
      res.setHeader(
        'Cache-Control',
        mappedPath.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache'
      );
      res.writeHead(200);
      res.end(data);
      return;
    }

    // For SPA routes: if it's NOT an asset, fall back to index.html
    if (!mappedPath.startsWith('/assets/')) {
      const indexPath = path.join(DIST_DIR, 'index.html');
      const data = await fs.readFile(indexPath);
      res.setHeader('Content-Type', MIME['.html']);
      res.setHeader('Cache-Control', 'no-cache');
      res.writeHead(200);
      res.end(data);
      return;
    }

    // Missing asset
    res.writeHead(404);
    res.end('Not Found');
  } catch (err) {
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

(async () => {
  // Fail fast with a clear error if dist is missing
  const hasDist = await fileExists(DIST_DIR);
  if (!hasDist) {
    console.error('❌ dist/ folder not found. Did you run "npm run build"?');
    process.exit(1);
  }

  server.listen(PORT, HOST, () => {
    console.log(`✅ Web server is listening on http://${HOST}:${PORT}`);
  });
})();
