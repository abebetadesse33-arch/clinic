// ==============================================================================
// NiniMed - Plesk Phusion Passenger Auto-Dotenv & Crash Diagnostic Logger
// ==============================================================================
const fs = require('fs');
const path = require('path');

// Auto-load .env from application root or parent directory if present
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

// Ensure startup crashes are written to passenger-startup-error.log for instant debugging
const errorLog = path.join(__dirname, 'passenger-startup-error.log');
try {
  fs.appendFileSync(
    errorLog,
    `[${new Date().toISOString()}] Starting NiniMed Passenger entrypoint from ${__dirname}\n`
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
