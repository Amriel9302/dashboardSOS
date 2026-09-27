import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const sql = getDb();
  let database = false;

  if (sql) {
    try {
      await sql`select 1 as ok`;
      database = true;
    } catch (error) {
      console.error("Database health check failed", error);
    }
  }

  return NextResponse.json({
    ok: database,
    database,
    whatsapp: Boolean(
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
        process.env.META_WEBHOOK_VERIFY_TOKEN &&
        process.env.META_APP_SECRET,
    ),
    metaAds: Boolean(
      process.env.META_ACCESS_TOKEN &&
        process.env.META_AD_ACCOUNT_ID &&
        process.env.META_GRAPH_VERSION,
    ),
  });
}
