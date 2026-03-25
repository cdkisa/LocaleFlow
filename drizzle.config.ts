import { defineConfig } from "drizzle-kit";

const provider = process.env.DB_PROVIDER || "postgres";

if (provider === "postgres") {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set for PostgreSQL.");
  }
}

function buildConfig() {
  switch (provider) {
    case "sqlite":
      return defineConfig({
        out: "./migrations-sqlite",
        schema: "./shared/schema-sqlite.ts",
        dialect: "sqlite",
        dbCredentials: {
          url: process.env.SQLITE_PATH || "./data/localemanager.db",
        },
      });

    case "postgres":
    default:
      return defineConfig({
        out: "./migrations",
        schema: "./shared/schema.ts",
        dialect: "postgresql",
        dbCredentials: {
          url: process.env.DATABASE_URL!,
        },
      });
  }
  // MSSQL: no Drizzle config — schema is managed via raw DDL in MssqlStorage.initializeSchema()
}

export default buildConfig();
