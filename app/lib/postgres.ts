import postgres from "postgres";

const databaseUrl = process.env.SUPABASE_DB_URL;

if (!databaseUrl) {
  throw new Error("SUPABASE_DB_URL not configured");
}

const sql = postgres(databaseUrl, {
  ssl: "require",
  max: 5,
});

let schemaReady: Promise<void> | null = null;

export const ensureSchema = () => {
  if (!schemaReady) {
    schemaReady = sql`
      create table if not exists app_state (
        id text primary key,
        data jsonb not null,
        updated_at timestamptz not null default now()
      );
    `.then(() => undefined);
  }
  return schemaReady;
};

export default sql;
