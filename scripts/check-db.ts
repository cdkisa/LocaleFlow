import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const r = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
  console.log("Existing tables:");
  r.rows.forEach((row: any) => console.log(" ", row.tablename));

  // Check if missing tables exist
  const tables = r.rows.map((row: any) => row.tablename);

  if (!tables.includes('project_hyperlinks')) {
    console.log("\nCreating project_hyperlinks table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_hyperlinks (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        label VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("  Created.");
  }

  if (!tables.includes('translation_key_hyperlinks')) {
    console.log("\nCreating translation_key_hyperlinks table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS translation_key_hyperlinks (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        translation_key_id VARCHAR NOT NULL REFERENCES translation_keys(id) ON DELETE CASCADE,
        label VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("  Created.");
  }

  if (!tables.includes('translation_key_change_history')) {
    console.log("\nCreating translation_key_change_history table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS translation_key_change_history (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        translation_key_id VARCHAR NOT NULL REFERENCES translation_keys(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        action VARCHAR(50) NOT NULL,
        field VARCHAR(100),
        old_value TEXT,
        new_value TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("  Created.");
  }

  // Check for missing columns on translation_keys
  const colCheck = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'translation_keys' AND table_schema = 'public'
    ORDER BY ordinal_position
  `);
  const cols = colCheck.rows.map((r: any) => r.column_name);
  console.log("\ntranslation_keys columns:", cols.join(", "));

  if (!cols.includes('max_length')) {
    console.log("Adding max_length column...");
    await pool.query("ALTER TABLE translation_keys ADD COLUMN max_length INTEGER");
    console.log("  Added.");
  }
  if (!cols.includes('priority')) {
    console.log("Adding priority column...");
    await pool.query("ALTER TABLE translation_keys ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'normal'");
    console.log("  Added.");
  }

  console.log("\nDone.");
} catch (e: any) {
  console.error("Error:", e.message);
} finally {
  await pool.end();
}
