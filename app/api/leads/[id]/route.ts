import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const allowedStatuses = new Set([
  "novo",
  "qualificado",
  "orcamento",
  "fechado",
  "perdido",
  "fora_area",
]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Database not configured" },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  const body = await request.json();
  const update: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!allowedStatuses.has(body.status)) {
      return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
    }
    update.status = body.status;
  }

  if (body.quoteValue !== undefined) {
    update.quote_value = body.quoteValue === null ? null : Number(body.quoteValue);
  }

  if (body.saleValue !== undefined) {
    update.sale_value = body.saleValue === null ? null : Number(body.saleValue);
  }

  if (body.city !== undefined) {
    update.city = body.city || null;
    update.city_source = "manual";
    update.city_confidence = body.city ? 1 : null;
  }

  if (body.neighborhood !== undefined) {
    update.neighborhood = body.neighborhood || null;
  }

  const { data, error } = await supabase
    .from("leads")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, lead: data });
}
