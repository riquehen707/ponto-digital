import { NextResponse } from "next/server";
import type { JSONValue } from "postgres";
import sql, { ensureSchema } from "@/app/lib/postgres";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") ?? "primary";

  await ensureSchema();

  const rows = await sql<
    {
      data: unknown;
      updated_at: string;
    }[]
  >`select data, updated_at from app_state where id = ${key} limit 1`;

  if (!rows.length) {
    return NextResponse.json({ data: null });
  }

  return NextResponse.json({ data: rows[0].data, updatedAt: rows[0].updated_at });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { key?: string; data?: unknown };
  const key = body.key ?? "primary";

  if (!body.data) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  await ensureSchema();

  await sql`
    insert into app_state (id, data, updated_at)
    values (${key}, ${sql.json(body.data as JSONValue)}, now())
    on conflict (id)
    do update set data = excluded.data, updated_at = now();
  `;

  return NextResponse.json({ ok: true, updatedAt: new Date().toISOString() });
}
