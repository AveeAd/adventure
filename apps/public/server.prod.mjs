// Production entry point for the TanStack Start SSR build.
//
// `@tanstack/react-start`'s Vite plugin (the newer Vite-only architecture,
// not the older Vinxi/Nitro-based Start) only emits a Web-standard fetch
// handler at dist/server/server.js - it does not bundle a Node HTTP listener
// or a static-file server the way Nitro's "node-server" preset used to.
// This file is the small adapter that's otherwise missing: it serves
// dist/client's static assets directly, and forwards everything else into
// the fetch handler, translating Node's http.IncomingMessage/ServerResponse
// to/from the WHATWG Request/Response the handler expects. Uses only
// Node built-ins (available since Node 18) - no framework-internal APIs.
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from './dist/server/server.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CLIENT_DIR = join(__dirname, 'dist/client');
const PORT = Number(process.env.PORT) || 3001;

const MIME_TYPES = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.txt': 'text/plain',
};

function nodeRequestToWebRequest(req) {
  const url = `http://${req.headers.host}${req.url}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? req : undefined,
    duplex: hasBody ? 'half' : undefined,
  });
}

async function writeWebResponse(res, webResponse) {
  res.statusCode = webResponse.status;
  webResponse.headers.forEach((value, key) => res.setHeader(key, value));
  if (!webResponse.body) {
    res.end();
    return;
  }
  const reader = webResponse.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
}

function tryServeStatic(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return false;
  }
  const pathname = decodeURIComponent(new URL(req.url, 'http://placeholder').pathname);
  const filePath = join(CLIENT_DIR, pathname);
  if (!filePath.startsWith(CLIENT_DIR)) {
    return false;
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    return false;
  }
  // apple-app-site-association (deep links, MOBILE_PLAN.md Phase 7) has no
  // file extension by Apple's own spec, so it'd otherwise fall through to
  // application/octet-stream below - special-cased by filename instead.
  const contentType =
    basename(filePath) === 'apple-app-site-association' ? 'application/json' : MIME_TYPES[extname(filePath)];
  res.setHeader('content-type', contentType ?? 'application/octet-stream');
  createReadStream(filePath).pipe(res);
  return true;
}

const server = createServer(async (req, res) => {
  try {
    if (tryServeStatic(req, res)) {
      return;
    }
    const webResponse = await handler.fetch(nodeRequestToWebRequest(req));
    await writeWebResponse(res, webResponse);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.statusCode = 500;
    }
    res.end('Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`apps/public listening on :${PORT}`);
});
