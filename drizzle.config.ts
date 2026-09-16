import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  driver: "mysql2",
  dbCredentials: {
    uri: process.env.DATABASE_URL || "mysql://root:root@localhost:3306/clinic_enterprise",
  },
} satisfies Config;
