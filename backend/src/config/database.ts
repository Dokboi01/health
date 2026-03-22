import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

import { env } from "./env";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30_000,
});

export const runQuery = <T extends QueryResultRow>(
  text: string,
  values?: unknown[],
): Promise<QueryResult<T>> => pool.query<T>(text, values);

export const withTransaction = async <T>(handler: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

