
import fs from "node:fs";
import path from "node:path";
import type { PoolOptions, SslOptions } from "mysql2/promise";

function getSslConfig(): SslOptions {
  return {
    rejectUnauthorized: false,
  };
}

export function getMysqlConnectionConfig(): PoolOptions {
  const databaseUrl = process.env.DATABASE_URL;

  const ssl = getSslConfig();

  const commonOptions = {
    ssl,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    enableKeepAlive: true,
    connectTimeout: 15000,
  };

  if (databaseUrl) {
    const url = new URL(databaseUrl);

    return {
      ...commonOptions,
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.slice(1)),
    };
  }

  const {
    DB_HOST,
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
  } = process.env;

  if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    throw new Error("MySQL environment variables are missing.");
  }

  return {
    ...commonOptions,
    host: DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  };
}
