import mysql from "mysql2/promise";

const url = new URL(process.env.DATABASE_URL);

const db = await mysql.createConnection({
  host: url.hostname,
  port: Number(url.port),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
  connectTimeout: 15000
});

try {
  const [rows] = await db.query("SELECT 1 AS connected");
  console.log("DATABASE CONNECTED:", rows);
} catch (err) {
  console.error("DATABASE ERROR:", err);
} finally {
  await db.end();
}
