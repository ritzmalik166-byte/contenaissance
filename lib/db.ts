
import mysql from "mysql2/promise";
import { getMysqlConnectionConfig } from "@/lib/db-config";

export async function query<T = unknown>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const connection = await mysql.createConnection(
    getMysqlConnectionConfig()
  );

  try {
    const [rows] = await connection.query(sql, params);
    return rows as T[];
  } finally {
    await connection.end();
  }
}

export async function queryOne<T = unknown>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function pingDatabase(): Promise<boolean> {
  const connection = await mysql.createConnection(
    getMysqlConnectionConfig()
  );

  try {
    await connection.ping();
    return true;
  } finally {
    await connection.end();
  }
}
