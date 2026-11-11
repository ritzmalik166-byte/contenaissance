
import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import { getConnectionConfig } from "./db-config.mjs";

async function main() {
  const migrationPath = path.join(
    process.cwd(),
    "database",
    "migrate-careers.sql",
  );

  const migration = await fs.readFile(migrationPath, "utf8");

  const connection = await mysql.createConnection(
    getConnectionConfig({ multipleStatements: true }),
  );

  try {
    await connection.query(migration);
    console.log("Career migration applied successfully.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Failed to apply career migration:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
