import mysql from "mysql2/promise";

const url = new URL(process.env.DATABASE_URL);

const pool = mysql.createPool({
  host: url.hostname,
  port: Number(url.port),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),

  ssl: {
    rejectUnauthorized: false,
  },

  waitForConnections: true,
  connectionLimit: 5,
  connectTimeout: 20000,
  enableKeepAlive: true,
});

try {
  for (let i = 0; i < 5; i++) {
    const [rows] = await pool.query("SELECT 1 AS connected");
    console.log(`Query ${i + 1}:`, rows);
  }
} catch (error) {
  console.error("POOL ERROR:", error);
} finally {
  await pool.end();
}