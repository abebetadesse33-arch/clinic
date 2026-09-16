// ==============================================================================
// NiniMed - Plesk Phusion Passenger Auto-Dotenv & Crash Diagnostic Logger
// ==============================================================================
(function initializePassengerPrelude() {
const fs = require('fs');
const path = require('path');
const http = require('http');

// 1. Phusion Passenger Port & Socket Interception
// Next.js standalone server.js runs `parseInt(process.env.PORT, 10) || 3000`.
// Under Phusion Passenger, process.env.PORT is non-numeric ('passenger' or a unix socket path).
// `parseInt` converts it to NaN, causing Next.js to listen on TCP 3000 instead of Passenger's socket.
// Intercept http.Server.prototype.listen so when Next attempts to listen on 3000, it forwards to Passenger's socket target.
const passengerPort = process.env.PORT;
const isPassenger =
  process.env.PASSENGER_APP_ENV ||
  process.env.PHUSION_PASSENGER ||
  (passengerPort && (passengerPort === 'passenger' || isNaN(Number(passengerPort))));

if (isPassenger && passengerPort) {
  const originalListen = http.Server.prototype.listen;
  http.Server.prototype.listen = function (...args) {
    if (typeof args[0] === 'number' || args[0] === 3000) {
      console.log(`[Passenger Prelude] Intercepted server.listen(${args[0]}), delegating to Phusion Passenger socket: ${passengerPort}`);
      return originalListen.call(this, passengerPort);
    }
    return originalListen.apply(this, args);
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
