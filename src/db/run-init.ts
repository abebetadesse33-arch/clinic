import mysql from "mysql2/promise";
import { ensureDatabaseInitialized } from "./migrate-and-seed";

async function main() {
  const connectionString =
    process.env.DATABASE_URL || "mysql://root:root@localhost:3306/clinic_enterprise";
  console.log("Connecting to the configured MySQL database...");
  const sql = mysql.createPool({ uri: connectionString, connectionLimit: 5 });
  try {
    await ensureDatabaseInitialized(sql);
    console.log("✅ Database initialized successfully with all new tables!");
  } catch (err) {
    console.error("❌ Init error:", err);
  } finally {
    await sql.end();
  }
}

main();
