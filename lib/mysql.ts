// lib/mysql.ts
// Thin wrapper that re‑exports the query helpers used throughout the codebase.
// Existing project code imports '@/lib/mysql' directly, but the actual implementations
// live in lib/db.ts. Providing this file keeps the import paths stable without
// touching every import statement.

export { query, queryOne, pingDatabase } from "@/lib/db";

