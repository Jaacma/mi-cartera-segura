import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, 'docs');
const port = Number(process.env.PORT || 3000);
const host = '0.0.0.0';

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function send(res, status, body, contentType = 'application/json; charset=utf-8') {
  const data = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(data),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(data);
}

function safeFile(urlPath) {
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const target = path.resolve(docsDir, rel);
  return target.startsWith(path.resolve(docsDir) + path.sep) || target === path.resolve(docsDir)
    ? target
    : null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/health') {
    return send(res, 200, {
      status: 'ok',
      service: 'mi-cartera-segura',
      time: new Date().toISOString(),
      encrypted: true,
    });
  }

  if (url.pathname === '/api/portfolio/encrypted') {
    const file = path.join(docsDir, 'data', 'portfolio.enc.json');
    try {
      return send(res, 200, fs.readFileSync(file, 'utf8'));
    } catch {
      return send(res, 500, { error: 'No se pudo leer la cartera cifrada' });
    }
  }

  if (url.pathname.startsWith('/api/')) {
    return send(res, 404, { error: 'Ruta no encontrada' });
  }

  let file = safeFile(url.pathname);
  if (!file) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(docsDir, 'index.html');

  try {
    const ext = path.extname(file).toLowerCase();
    const body = fs.readFileSync(file);
    res.writeHead(200, {
      'Content-Type': mime[ext] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    });
    res.end(body);
  } catch {
    send(res, 500, 'Error interno', 'text/plain; charset=utf-8');
  }
});

server.listen(port, host, () => {
  console.log(`Mi Cartera escuchando en http://${host}:${port}`);
});
