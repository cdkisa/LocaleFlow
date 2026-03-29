// Backward-compatibility re-export.
// The PostgreSQL connection is now managed inside server/providers/postgres-storage.ts.
// If you need the raw Drizzle `db` instance, import from there instead.
export { pool } from "./providers/postgres-storage";
