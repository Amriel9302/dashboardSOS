import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const allowedStatuses = new Set([
  "novo",
  "qualificado",
  "orcamento",
  "fechado",
  "perdido",
  "fora_area",
]);

type LeadRow = {
  status: string;
  quote_value: string | number | null;
  sale_value: string | number | null;
  city: string | null;
  neighborhood: string | null;
  city_source: string | null;
  city_confidence: string | number | null;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const sql = getDb();

  if (!sql) {
    return NextResponse.json(
      { ok: false, error: "Database not configured" },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  const body = await request.json();

  if (body.status !== undefined && !allowedStatuses.has(body.status)) {
    return NextResponse.json(
      { ok: false, error: "Invalid status" },
      { status: 400 },
    );
  }

  try {
    const rows = (await sql`
      select
        status,
        quote_value,
        sale_value,
        city,
        neighborhood,
        city_source,
        city_confidence
      from public.leads
      where id = ${id}::uuid
      limit 1
    `) as LeadRow[];

    const current = rows[0];

    if (!current) {
      return NextResponse.json(
        { ok: false, error: "Lead not found" },
        { status: 404 },
      );
    }

    const status =
      body.status === undefined ? current.status : String(body.status);

    const quoteValue =
      body.quoteValue === undefined
        ? current.quote_value
        : body.quoteValue === null
          ? null
          : Number(body.quoteValue);

    const saleValue =
      body.saleValue === undefined
        ? current.sale_value
        : body.saleValue === null
          ? null
          : Number(body.saleValue);

    const city =
      body.city === undefined
        ? current.city
        : body.city
          ? String(body.city).trim()
          : null;

    const neighborhood =
      body.neighborhood === undefined
        ? current.neighborhood
        : body.neighborhood
          ? String(body.neighborhood).trim()
          : null;

    const cityWasManuallyChanged = body.city !== undefined;
    const citySource = cityWasManuallyChanged
      ? "manual"
      : current.city_source;
    const cityConfidence = cityWasManuallyChanged
      ? city
        ? 1
        : null
      : current.city_confidence;

    const updated = await sql`
      update public.leads
      set
        status = ${status},
        quote_value = ${quoteValue},
        sale_value = ${saleValue},
        city = ${city},
        neighborhood = ${neighborhood},
        city_source = ${citySource},
        city_confidence = ${cityConfidence}
      where id = ${id}::uuid
      returning *
    `;

    return NextResponse.json({ ok: true, lead: updated[0] });
  } catch (error) {
    console.error("Lead update failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
