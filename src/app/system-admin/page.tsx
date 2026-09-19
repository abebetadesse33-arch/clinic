import { redirect } from "next/navigation";

/**
 * /system-admin → /admin permanent redirect.
 *
 * The live server was receiving requests to /system-admin (e.g. from old
 * bookmarks, the manifest shortcuts, or external links) but the actual admin
 * dashboard lives at /admin.  This server-side redirect fixes the 404 without
 * breaking any existing deep-links.
 */
export default function SystemAdminRedirect() {
  redirect("/admin");
}
