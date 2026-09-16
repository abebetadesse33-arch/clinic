// ==============================================================================
// NiniMed - Plesk Phusion Passenger Node.js Entrypoint (.plesk.startup.cjs)
// ==============================================================================
// Plesk's "Auto-configure hosting" for Next.js sets the Node.js application's
// startup file to this exact name. Delegate to the same entrypoint server.js
// and app.js already use so behavior (PORT/socket binding, .env auto-load,
// crash logging) is identical no matter which of the three names Plesk is
// actually configured to run.
require("./server.js");
