import postgres from "postgres";

const databaseUrl = process.env.SUPABASE_DB_URL;

let sqlInstance: ReturnType<typeof postgres> | null = null;

if (databaseUrl) {
  sqlInstance = postgres(databaseUrl, {
    ssl: "require",
    max: 5,
  });
} else {
  console.warn("SUPABASE_DB_URL not configured");
}

let schemaReady: Promise<void> | null = null;

export const getSql = () => {
  if (!sqlInstance) {
    throw new Error("SUPABASE_DB_URL not configured");
  }
  return sqlInstance;
};

export const ensureSchema = () => {
  if (!schemaReady) {
    const sql = getSql();
    schemaReady = sql`
      create table if not exists public.app_state (
        id text primary key,
        data jsonb not null,
        updated_at timestamptz not null default now(),
        created_at timestamptz not null default now(),
        schema_version int not null default 1
      );
    `
      .then(() =>
        sql`alter table public.app_state add column if not exists created_at timestamptz not null default now()`
      )
      .then(() =>
        sql`alter table public.app_state add column if not exists schema_version int not null default 1`
      )
      .then(() => undefined);
  }
  return schemaReady;
};

export default sqlInstance;
