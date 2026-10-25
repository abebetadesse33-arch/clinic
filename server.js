// ==============================================================================
// NiniMed - Plesk Phusion Passenger Node.js Entrypoint
// ==============================================================================
const fs = require('fs');
const path = require('path');

// Auto-load prelude for auto-dotenv, crash logging & Passenger socket handling
if (fs.existsSync('./scripts/server-prelude.js')) {
  require('./scripts/server-prelude.js');
} else if (fs.existsSync('./plesk-prelude.js')) {
  require('./plesk-prelude.js');
}

const candidatePaths = [
  path.join(__dirname, '.next', 'standalone', 'server.js'),
  path.join(__dirname, 'current', '.next', 'standalone', 'server.js'),
  path.join(process.cwd(), '.next', 'standalone', 'server.js'),
];

let standaloneServerPath = null;
for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    standaloneServerPath = p;
    break;
  }
}

if (standaloneServerPath) {
  try {
    require(standaloneServerPath);
  } catch (error) {
    const message = `[${new Date().toISOString()}] Synchronous startup failure loading ${standaloneServerPath}:\n${error?.stack || error}\n\n`;
    try {
      fs.appendFileSync(path.join(__dirname, 'passenger-startup-error.log'), message);
    } catch (_) {}
    console.error('[CRITICAL] Startup failure:', message);
    throw error;
  }
} else {
  let fileList = [];
  try { fileList = fs.readdirSync(__dirname); } catch (_) {}
  const message = `[${new Date().toISOString()}] Could not locate .next/standalone/server.js in any candidate path:\n` +
    candidatePaths.map((p) => ` - ${p} (exists: ${fs.existsSync(p)})`).join('\n') +
    `\nCurrent directory: ${__dirname}\nProcess cwd: ${process.cwd()}\n` +
    `Files in __dirname: ${fileList.join(', ')}\n\n`;

  try {
    fs.appendFileSync(path.join(__dirname, 'passenger-startup-error.log'), message);
  } catch (_) {}
  console.error('[CRITICAL]', message);

  // Fallback diagnostic HTTP server to prevent silent 503
  const http = require('http');
  const server = http.createServer((req, res) => {
    // External app redirects (e.g. /feud, /school, /wa, /paraphrase)
    const appRedirects = {
      '/school': 'https://school.wisdomcourse.com.et',
      '/feud': 'https://feud.wisdomcourse.com.et',
      '/paraphrase': 'https://paraphrase.wisdomcourse.com.et',
      '/wa': 'https://app.wisdomcourse.com.et',
    };
    for (const [prefix, host] of Object.entries(appRedirects)) {
      if (req.url === prefix || req.url.startsWith(`${prefix}/`) || req.url.startsWith(`${prefix}?`)) {
        const target = `${host}${req.url.slice(prefix.length) || '/'}`;
        res.writeHead(307, { Location: target });
        res.end();
        return;
      }
    }

    // Health checks in fallback mode
    if (req.url === '/api/health' || req.url === '/health/api/health' || req.url === '/api/health/' || req.url === '/health/api/health/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'degraded',
        message: 'NiniMed fallback server is active. Build is compiling or missing standalone files.',
        commit: process.env.NEXT_PUBLIC_BUILD_SHA || 'unknown',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html>
<head><title>NiniMed - Build Required</title><style>body{font-family:system-ui,sans-serif;padding:2rem;background:#0d1117;color:#c9d1d9;}h1{color:#f85149;}pre{background:#161b22;padding:1rem;border-radius:6px;overflow:auto;border:1px solid #30363d;}</style></head>
<body>
<h1>NiniMed - Standalone Build Missing</h1>
<p>Phusion Passenger successfully executed <code>server.js</code>, but the compiled Next.js standalone build files were not found.</p>
<pre>${message}</pre>
<p><strong>To resolve:</strong> In Plesk → Websites & Domains → Git, run "Pull Updates" and ensure <code>bash scripts/plesk-git-deploy.sh</code> is run to build the app, or restart the Node.js application after building.</p>
</body>
</html>`);
  });

  const port = process.env.PORT || 3000;
  server.listen(port);
}
