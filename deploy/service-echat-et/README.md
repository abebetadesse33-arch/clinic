# service.echat.et: five apps on one domain

| URL | App | Repo | Prefix handling |
|---|---|---|---|
| `/` | portal page | `portal/index.html` | static |
| `/health/` | Clinic (NiniMed) | abebetadesse33-arch/clinic | its own middleware serves `/health`; build assets live at the domain root |
| `/school/` | School (Forma) | abebetadesse/wa-push | Next `basePath` (`NEXT_PUBLIC_BASE_PATH=/school`), prefix kept |
| `/wa/` | WA (Ethiopian Wisdom) | abebetadesse/wa | Next `basePath` (`NEXT_PUBLIC_BASE_PATH=/wa`), prefix kept |
| `/feud/` | Feud | abebetadesse/Feud | Next `basePath` + socket.io path (`NEXT_PUBLIC_BASE_PATH=/feud`), prefix kept |
| `/paraphrase/` | Paraphrase | abebetadesse/Paraphrase | nginx strips the prefix; app derives it from `PUBLIC_BASE_URL` |

Files here: `nginx-service.echat.et.conf` (routing), `env/*.env.example` (settings per app, placeholders
only), `db-provision.sql` (schemas and users, placeholders only), `portal/index.html`.

## Rules

- Secrets (DB passwords, `*_SECRET`, `JWT_SECRET`, `ADMIN_API_KEY`) live only in the Plesk Node.js
  environment panel, the process manager's environment or a GitHub secret. Never in a file in a repo.
- One schema and one MySQL user per app (`db-provision.sql`). The apps never use the administrator account.
- `NEXT_PUBLIC_BASE_PATH` is inlined at build time: set it for the build, then run that build.
- Session cookies are scoped per app (Clinic `NINIMED_COOKIE_PATH=/health`; the Next apps use their
  prefix; School uses the `forma` cookie prefix; Paraphrase uses bearer tokens, no cookie).

## Order of work (nothing before step 3 touches production)

1. Review and merge the `feat/service-echat-et-path` branch of each app (Clinic: `feat/service-echat-et-prep`).
   Clinic's `main` deploys to production on push; merge it only when you are ready.
2. Run each app's migrations against a throwaway MySQL first (Clinic: `scripts/db-migrate.ts`, then
   `scripts/db-seed.ts`; WA: `npm run db:setup`; Feud: `bun run db:migrate`; Paraphrase:
   `node node/deploy.js migrate` or the Python app's startup; School: `npm run db:migrate:prod`).
3. DBA runs `db-provision.sql` with real passwords (rotate the password that was pasted in chat).
   Confirm the app server can reach `10.180.50.142:3306` (`mysql -h 10.180.50.142 -u <app user> -p`).
4. Build and start each app with its `env/*.env.example` values on its port.
5. Test every app directly on its port, then through nginx with
   `curl --resolve service.echat.et:443:<server-ip> https://service.echat.et/...` before DNS or links change.
6. Apply `nginx-service.echat.et.conf`, then run the checklist below.

## Verification checklist

Routing (each should be 200 or the stated redirect):
- `/` shows the portal; `/health` -> 301 `/health/`; `/paraphrase` -> 301 `/paraphrase/`.
- `/health/api/health`, `/school/api/health`, `/paraphrase/api/v1/health`, `/wa/` and `/feud/login` respond.
- Page source of each app references its own prefix: `/school/_next/...`, `/wa/_next/...`, `/feud/_next/...`,
  `/paraphrase/static/...`, and Clinic `/_next/...`.
- Unprefixed `/login` is redirected by Clinic to `/health/login` and does not land in another app.

Sign-in and cookies (browser dev tools > Application > Cookies, host service.echat.et):
- Clinic `Nini_session` has Path `/health`, HttpOnly, Secure; Feud `auth_token` Path `/feud`;
  WA `ethio_access` Path `/wa`; School cookies start with `forma`.
- Signing in to one app does not sign you in to, or out of, another. Signing out clears the cookie
  (it is cleared with the same path it was set with).
- Unauthenticated calls to `/health/api/v1/...` return 401, not data.

Realtime and uploads:
- Feud: the browser opens `/feud/socket.io/` (polling or WebSocket) and a buzzer press reaches the display.
- Clinic notifications stream (server-sent events) stays open through nginx.
- Paraphrase job progress streams; a document upload up to `MAX_UPLOAD_SIZE_MB` succeeds; the
  download link starts with `/paraphrase/downloads/`.
- WA: the service worker registers at `/wa/sw.js` with scope `/wa/`; the offline page works.

Database:
- Each app connects with its own user; `SHOW GRANTS` for it lists only its own schema.
- Clinic with `NINIMED_AUTO_MIGRATE=false` creates no tables on boot.
- `git grep` for the DB password and the SSH key in every repo returns nothing.
- TLS certificate for `service.echat.et` is valid.

## Known gaps

- Clinic's installed-app manifest and service worker (`/sw.js`, `/manifest...`) live at the domain
  root, not under `/health`.
- Feud's `public/manifest.json` has `start_url: "/"`.
- Links between apps (for example WA's link to School) must be set through env:
  `NEXT_PUBLIC_SCHOOL_APP_URL=https://service.echat.et/school`.
- Single sign-on across the apps is not part of this; each app keeps its own accounts.
