'use strict';
/**
 * Zero-dependency HTTP server (Node built-in `http` only).
 *
 * Security controls applied here (see ../SECURITY.md):
 *  - Strict security headers incl. a locked-down Content-Security-Policy
 *  - Per-IP in-memory rate limiting (anti brute-force / DoS)
 *  - Bounded request bodies (reject oversized payloads)
 *  - "Reject by default" input validation before any game logic
 *  - Generic error responses (no stack traces / internals leaked)
 *  - Server-authoritative game state (client cannot cheat)
 */
const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const {
  startGame,
  choose,
  submitMiniGame,
  classifyTerminal,
  getView,
  GameEngineError,
} = require('./engine.js');
const { FACILITIES, ROLES } = require('./content.js');
const {
  isUuid,
  parseJson,
  validateStart,
  validateChoose,
  validateMiniGame,
  validateTermProbe,
} = require('./validate.js');

const PORT = Number(process.env.PORT) || 4000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_BODY_BYTES = 16 * 1024; // 16kb cap

// ───────────────────────────── rate limiting ─────────────────────────────
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 120;
const hits = new Map(); // ip -> { count, resetAt }

function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > RATE_MAX;
}
// Periodically prune the rate-limit map so it can't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of hits) if (now > rec.resetAt) hits.delete(ip);
}, RATE_WINDOW_MS).unref();

// ───────────────────────────── helpers ─────────────────────────────
function securityHeaders(res, isHtml) {
  // API responses get the strictest CSP; the HTML page needs its own styles/scripts.
  const csp = isHtml
    ? "default-src 'none'; img-src 'self'; style-src 'self'; " +
      "script-src 'self'; connect-src 'self'; base-uri 'none'; " +
      "form-action 'none'; frame-ancestors 'none'"
    : "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";
  res.setHeader('Content-Security-Policy', csp);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  // Transport security: once TLS is terminated at the edge (see SECURITY.md),
  // force browsers to stay on HTTPS. Only emitted in production to avoid
  // breaking plain-HTTP local development on localhost.
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
  }
}

function sendJson(res, status, obj) {
  securityHeaders(res, false);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.writeHead(status);
  res.end(JSON.stringify(obj));
}

function sendError(res, status, message, code) {
  sendJson(res, status, code ? { error: message, code } : { error: message });
}

/**
 * Read a request body with a hard size cap. On overflow we respond with a clean
 * 413 and then stop reading, rather than abruptly destroying the socket (which
 * would surface to clients as a confusing connection reset).
 * Resolves to a string on success, or null if the response was already sent.
 */
function readBody(req, res) {
  return new Promise((resolve) => {
    let size = 0;
    let done = false;
    const chunks = [];
    req.on('data', (c) => {
      if (done) return;
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        done = true;
        sendError(res, 413, 'Payload too large.', 'too_large');
        // Drain the rest so the socket closes cleanly after our response.
        req.resume();
        resolve(null);
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (done) return;
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', () => {
      if (done) return;
      done = true;
      resolve(null);
    });
  });
}

// ───────────────────────── static file serving ─────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

function serveStatic(req, res) {
  // Only GET/HEAD; map "/" to index.html. Prevent path traversal.
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/index.html';
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    return sendError(res, 403, 'Forbidden.');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) return sendError(res, 404, 'Not found.');
    const ext = path.extname(filePath);
    securityHeaders(res, ext === '.html');
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.writeHead(200);
    res.end(data);
  });
}

// ───────────────────────────── router ─────────────────────────────
const requestHandler = async (req, res) => {
  const ip = req.socket.remoteAddress || 'unknown';
  const url = req.url || '/';
  const method = req.method || 'GET';

  try {
    if (rateLimited(ip)) {
      return sendError(res, 429, 'Too many requests.', 'rate_limited');
    }

    // API routes
    if (url.startsWith('/api/')) {
      const route = url.split('?')[0];

      if (method === 'GET' && route === '/api/health') {
        return sendJson(res, 200, { status: 'ok' });
      }
      if (method === 'GET' && route === '/api/content/facilities') {
        return sendJson(res, 200, { facilities: Object.values(FACILITIES) });
      }
      if (method === 'GET' && route === '/api/content/roles') {
        return sendJson(res, 200, { roles: Object.values(ROLES) });
      }

      if (method === 'POST' && route === '/api/game/start') {
        const raw = await readBody(req, res);
        if (raw === null) return; // response already sent (too large / error)
        const parsed = parseJson(raw);
        if (!parsed.ok) return sendError(res, 400, 'Invalid request.', 'validation');
        const v = validateStart(parsed.value);
        if (!v.ok) return sendError(res, 400, 'Invalid request.', 'validation');
        return sendJson(res, 201, startGame(v.value));
      }

      // /api/game/:sessionId  and  /api/game/:sessionId/{choose,minigame,terminal}
      const gameMatch = route.match(/^\/api\/game\/([^/]+)(\/choose|\/minigame|\/terminal)?$/);
      if (gameMatch) {
        const sessionId = gameMatch[1];
        const action = gameMatch[2]; // undefined | '/choose' | '/minigame'
        if (!isUuid(sessionId)) {
          return sendError(res, 400, 'Invalid request.', 'validation');
        }
        if (method === 'GET' && !action) {
          return sendJson(res, 200, getView(sessionId));
        }
        if (method === 'POST' && action === '/choose') {
          const raw = await readBody(req, res);
          if (raw === null) return; // response already sent (too large / error)
          const parsed = parseJson(raw);
          if (!parsed.ok) return sendError(res, 400, 'Invalid request.', 'validation');
          const v = validateChoose(parsed.value);
          if (!v.ok) return sendError(res, 400, 'Invalid request.', 'validation');
          return sendJson(res, 200, choose(sessionId, v.value));
        }
        if (method === 'POST' && action === '/minigame') {
          const raw = await readBody(req, res);
          if (raw === null) return; // response already sent (too large / error)
          const parsed = parseJson(raw);
          if (!parsed.ok) return sendError(res, 400, 'Invalid request.', 'validation');
          const v = validateMiniGame(parsed.value);
          if (!v.ok) return sendError(res, 400, 'Invalid request.', 'validation');
          return sendJson(res, 200, submitMiniGame(sessionId, v.value));
        }
        if (method === 'POST' && action === '/terminal') {
          const raw = await readBody(req, res);
          if (raw === null) return; // response already sent (too large / error)
          const parsed = parseJson(raw);
          if (!parsed.ok) return sendError(res, 400, 'Invalid request.', 'validation');
          const v = validateTermProbe(parsed.value);
          if (!v.ok) return sendError(res, 400, 'Invalid request.', 'validation');
          return sendJson(res, 200, classifyTerminal(sessionId, v.value));
        }
      }

      return sendError(res, 404, 'Not found.', 'not_found');
    }

    // Static client (GET/HEAD only)
    if (method === 'GET' || method === 'HEAD') {
      return serveStatic(req, res);
    }
    return sendError(res, 405, 'Method not allowed.');
  } catch (err) {
    if (err instanceof GameEngineError) {
      return sendError(res, 400, err.message, err.code);
    }
    // Unexpected: log server-side only, return nothing revealing.
    console.error('[error]', err);
    return sendError(res, 500, 'Internal server error.', 'internal');
  }
};

/**
 * Transport: in production, TLS is normally terminated at a reverse proxy /
 * load balancer with a CA-issued certificate, and this app receives plain HTTP
 * on a trusted internal network (see SECURITY.md → Transport security).
 *
 * For end-to-end TLS in a lab, set TLS_KEY_FILE and TLS_CERT_FILE and the server
 * will listen over HTTPS instead — no code changes needed.
 */
let server;
if (process.env.TLS_KEY_FILE && process.env.TLS_CERT_FILE) {
  const options = {
    key: fs.readFileSync(process.env.TLS_KEY_FILE),
    cert: fs.readFileSync(process.env.TLS_CERT_FILE),
  };
  server = https.createServer(options, requestHandler);
  server.listen(PORT, () => {
    console.log(`[cyber-trail] running on https://localhost:${PORT} (TLS)`);
  });
} else {
  server = http.createServer(requestHandler);
  server.listen(PORT, () => {
    console.log(
      `[cyber-trail] running on http://localhost:${PORT} ` +
        `(plain HTTP — fine for localhost; terminate TLS at the edge in prod)`,
    );
  });
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`[cyber-trail] ${sig} received, shutting down.`);
    server.close(() => process.exit(0));
  });
}

module.exports = { server };
