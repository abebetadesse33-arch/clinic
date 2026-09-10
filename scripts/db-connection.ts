import postgres, { type Sql } from "postgres";

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

export async function connectToDatabase(connectionString: string, operation: string): Promise<Sql> {
  if (
    process.env.GITHUB_ACTIONS === "true" &&
    /@(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\//i.test(connectionString)
  ) {
    throw new Error(
      `${operation}: DATABASE_URL points to localhost on GitHub Actions runner. GitHub Actions cannot reach a database on its own localhost. Configure a reachable database host or let migrations run on the server.`,
    );
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    const sql = postgres(connectionString, {
      max: 1,
      connect_timeout: 10,
      idle_timeout: 30,
    });

    try {
      await sql`select 1`;
      return sql;
    } catch (error) {
      lastError = error;
      await sql.end({ timeout: 1 }).catch(() => undefined);
      if (attempt < RETRIES) {
        console.warn(`${operation}: database unavailable; retrying (${attempt}/${RETRIES})...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  const details = [...new Set(errorDetails(lastError))].join(" | ");
  throw new Error(`${operation}: unable to connect to PostgreSQL after ${RETRIES} attempts. ${details}`);
}
