import { NextResponse } from "next/server";
import type { JSONValue } from "postgres";
import { ensureSchema, getSql } from "@/app/lib/postgres";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key") ?? "primary";

    await ensureSchema();
    const sql = getSql();

    const rows = await sql<
      {
        data: unknown;
        updated_at: string;
        schema_version: number | null;
      }[]
    >`select data, updated_at, schema_version from public.app_state where id = ${key} limit 1`;

    if (!rows.length) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({
      data: rows[0].data,
      updatedAt: rows[0].updated_at,
      schemaVersion: rows[0].schema_version ?? 1,
    });
  } catch (error) {
    console.error("GET /api/state error", error);
    return NextResponse.json(
      {
        error: "Erro ao carregar dados.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { key?: string; data?: unknown };
    const key = body.key ?? "primary";

    if (!body.data) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    await ensureSchema();
    const sql = getSql();

    await sql`
      insert into public.app_state (id, data, updated_at, schema_version)
      values (${key}, ${sql.json(body.data as JSONValue)}, now(), 1)
      on conflict (id)
      do update set data = excluded.data, updated_at = now(), schema_version = excluded.schema_version;
    `;

    return NextResponse.json({ ok: true, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("POST /api/state error", error);
    return NextResponse.json(
      {
        error: "Erro ao salvar dados.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
