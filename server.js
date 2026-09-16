// ==============================================================================
// NiniMed - Plesk Phusion Passenger Node.js Entrypoint
// ==============================================================================
// Auto-load prelude for auto-dotenv, crash logging & Passenger socket handling
if (require('fs').existsSync('./scripts/server-prelude.js')) {
  require('./scripts/server-prelude.js');
} else if (require('fs').existsSync('./plesk-prelude.js')) {
  require('./plesk-prelude.js');
}

try {
  require('./.next/standalone/server.js');
} catch (error) {
  const fs = require('fs');
  const path = require('path');
  const message = `[${new Date().toISOString()}] Synchronous startup failure:\n${error?.stack || error}\n\n`;
  try {
    fs.appendFileSync(path.join(__dirname, 'passenger-startup-error.log'), message);
  } catch (_) {}
  console.error('[CRITICAL] Startup failure:', message);
  throw error;
}
