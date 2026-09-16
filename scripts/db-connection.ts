import mysql, { type Pool } from "mysql2/promise";

const RETRIES = 8;
const RETRY_DELAY_MS = 3000;

function errorDetails(error: unknown): string[] {
  if (error instanceof AggregateError) {
    return error.errors.flatMap(errorDetails);
  }

  if (error instanceof Error) {
    const cause = "cause" in error ? error.cause : undefined;
    const details = [error.message || error.name];
    if (cause) details.push(...errorDetails(cause));
    return details;
  }

  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;
    const message = [value.code, value.message, value.address, value.port]
      .filter(Boolean)
      .join(" ");
    return [message || JSON.stringify(error)];
  }

  return [String(error)];
}

export async function connectToDatabase(connectionString: string, operation: string): Promise<Pool> {

  if (/^postgres(ql)?:\/\//i.test(connectionString)) {
    throw new Error(
      `[${operation}] DATABASE_URL must use MySQL (mysql://). PostgreSQL is not supported by NiniMed's MySQL schema.`
    );
  }

  const atMatches = connectionString.match(/@/g);
  if (atMatches && atMatches.length > 1) {
    console.warn(
      `[${operation}] ⚠️  DATABASE_URL contains multiple '@' symbols. URL-encode special password characters: '@' -> '%40', '&' -> '%26'`
    );
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    const pool = mysql.createPool({
      uri: connectionString,
      connectionLimit: 1,
      connectTimeout: 10_000,
    });

    try {
      await pool.query("SELECT 1");
      return pool;
    } catch (error) {
      lastError = error;
      await pool.end().catch(() => undefined);
      if (attempt < RETRIES) {
        console.warn(`${operation}: database unavailable; retrying (${attempt}/${RETRIES})...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  const details = [...new Set(errorDetails(lastError))].join(" | ");
  throw new Error(`${operation}: unable to connect to MySQL after ${RETRIES} attempts. ${details}`);
}
