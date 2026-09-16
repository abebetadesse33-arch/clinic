// ==============================================================================
// NiniMed - Plesk Phusion Passenger Auto-Dotenv & Crash Diagnostic Logger
// ==============================================================================
(function initializePassengerPrelude() {
const fs = require('fs');
const path = require('path');
const http = require('http');

// 1. Phusion Passenger / Plesk Port & Socket Interception
// Plesk / Passenger sets process.env.PORT to a numeric port, 'passenger', or a Unix socket path.
// Next.js standalone server.js hardcodes port 3000 if PORT is non-numeric, or uses process.env.PORT.
// Intercept http.Server.prototype.listen to guarantee the server binds to process.env.PORT on 127.0.0.1.
if (!process.env.HOSTNAME || process.env.HOSTNAME === '0.0.0.0') {
  process.env.HOSTNAME = '127.0.0.1';
}

const targetPort = process.env.PORT;
if (targetPort) {
  const originalListen = http.Server.prototype.listen;
  http.Server.prototype.listen = function (...args) {
    const callback = args.find((arg) => typeof arg === 'function');
    const isSocketPath = isNaN(Number(targetPort));
    const listenTarget = isSocketPath ? targetPort : Number(targetPort);

    console.log(`[Passenger Prelude] Delegating server.listen to target port/socket: ${targetPort}`);
    if (isSocketPath) {
      if (callback) return originalListen.call(this, listenTarget, callback);
      return originalListen.call(this, listenTarget);
    } else {
      if (callback) return originalListen.call(this, listenTarget, '127.0.0.1', callback);
      return originalListen.call(this, listenTarget, '127.0.0.1');
    }
  };
}

// 2. Auto-load .env from application root or parent directory if present
const possibleEnvPaths = [
  path.join(__dirname, '.env'),
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '.env.production')
];

for (const p of possibleEnvPaths) {
  if (fs.existsSync(p)) {
    try {
      const lines = fs.readFileSync(p, 'utf8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eq = trimmed.indexOf('=');
          if (eq > 0) {
            const k = trimmed.slice(0, eq).trim();
            let v = trimmed.slice(eq + 1).trim();
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
              v = v.slice(1, -1);
            }
            if (!process.env[k]) {
              process.env[k] = v;
            }
          }
        }
      }
    } catch (e) {}
  }
}

// 3. Ensure startup crashes are written to passenger-startup-error.log for instant debugging
const errorLog = path.join(__dirname, 'passenger-startup-error.log');
try {
  fs.appendFileSync(
    errorLog,
    `[${new Date().toISOString()}] Starting NiniMed Passenger entrypoint from ${__dirname} (PORT=${process.env.PORT || 'default'})\n`
  );
} catch (e) {}

process.on('uncaughtException', (err) => {
  try {
    fs.appendFileSync(
      errorLog,
      `[${new Date().toISOString()}] Uncaught Exception:\n${err?.stack || err}\n\n`
    );
  } catch (e) {}
  console.error('[CRITICAL] Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  try {
    fs.appendFileSync(
      errorLog,
      `[${new Date().toISOString()}] Unhandled Rejection:\n${reason?.stack || reason}\n\n`
    );
  } catch (e) {}
  console.error('[CRITICAL] Unhandled rejection:', reason);
});
// ==============================================================================
})();
