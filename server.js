'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);
const API_URL = 'https://poke.idleworld.online/api/game/market?category=All';
// Configure this in Render > Environment. Never commit a token to GitHub.
// Set the raw access token only (without the 'Bearer ' prefix).
const GAME_ACCESS_TOKEN = String(process.env.GAME_ACCESS_TOKEN || '').trim();
const CACHE_TTL_MS = 15_000; // cache upstream responses to avoid excessive requests
const PUBLIC_DIR = path.join(__dirname, 'public');

let cache = null;
let cacheAt = 0;
let inFlight = null;

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(body));
}

async function fetchMarket() {
  if (!GAME_ACCESS_TOKEN) {
    return {
      ok: false,
      status: 503,
      error: 'Falta configurar GAME_ACCESS_TOKEN nas variáveis de ambiente do Render. Use um token de acesso válido obtido por um método autorizado; não o coloque no GitHub.',
    };
  }

  if (cache && Date.now() - cacheAt < CACHE_TTL_MS) {
    return { ok: true, data: cache, stale: false, cached: true };
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const upstream = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${GAME_ACCESS_TOKEN}`,
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (!upstream.ok) {
        if (upstream.status === 401) {
          throw new Error('A API respondeu HTTP 401: o token pode ter expirado ou ser inválido. Configure um token de acesso válido em Render > Environment.');
        }
        if (upstream.status === 403) {
          throw new Error('A API respondeu HTTP 403 mesmo com Bearer token. O servidor pode exigir uma forma de acesso autorizada específica ou estar bloqueando consultas fora do navegador. Não copie cookies cf_clearance nem tente contornar a proteção; solicite à equipe um método para integração server-to-server.');
        }
        throw new Error(`A API respondeu HTTP ${upstream.status}.`);
      }

      const payload = await upstream.json();
      if (!payload || !Array.isArray(payload.listings)) {
        throw new Error('A resposta não contém uma lista "listings" válida.');
      }

      // Only return the fields needed by this read-only viewer; do not expose charId.
      cache = {
        listings: payload.listings,
        fetchedAt: new Date().toISOString(),
        count: payload.listings.length,
      };
      cacheAt = Date.now();
      return { ok: true, data: cache, stale: false, cached: false };
    } catch (error) {
      if (cache) {
        return {
          ok: true,
          data: cache,
          stale: true,
          cached: true,
          warning: error && error.message ? error.message : 'Falha ao consultar a API.',
        };
      }
      return {
        ok: false,
        status: 502,
        error: error && error.message ? error.message : 'Falha ao consultar a API.',
      };
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${HOST}:${PORT}`);

  if (req.method === 'GET' && requestUrl.pathname === '/api/market') {
    const result = await fetchMarket();
    if (!result.ok) {
      return sendJson(res, result.status || 502, {
        error: result.error,
        apiUrl: API_URL,
        hint: 'Confira a mensagem de erro. O token é lido apenas da variável privada GAME_ACCESS_TOKEN; tokens não devem ser incluídos no código ou enviados ao navegador.',
      });
    }
    return sendJson(res, 200, {
      ...result.data,
      stale: result.stale,
      cached: result.cached,
      warning: result.warning || null,
    });
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, cacheAvailable: Boolean(cache), cacheAgeMs: cache ? Date.now() - cacheAt : null, accessTokenConfigured: Boolean(GAME_ACCESS_TOKEN) });
  }

  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', 'Allow': 'GET' });
    return res.end('Method not allowed. Este painel é somente leitura.');
  }

  const pathname = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const normalized = path.normalize(pathname).replace(/^([/\\]*\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, normalized.replace(/^[/\\]+/, ''));
  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== path.join(PUBLIC_DIR, 'index.html')) {
    res.writeHead(403); return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, contents) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
    res.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    });
    res.end(contents);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Poké Idle Market Monitor disponível na porta ${PORT}`);
  console.log('Somente leitura. Para encerrar, pressione Ctrl+C.');
});
