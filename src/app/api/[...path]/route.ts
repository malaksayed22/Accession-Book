import { NextResponse } from "next/server";

// MOCK: writes are accepted but not stored; reads return empty lists. The union of fields below
// covers what the forms read back after a successful request.
const empty = () => NextResponse.json({ ok: true, items: [], data: [], rows: [] });
const accepted = () =>
  NextResponse.json({
    ok: true,
    id: 1,
    name: "New record",
    units: [{ id: 1, name: "NEW-001" }],
    unit: { id: 1, name: "NEW-001" },
    experiment: { id: 1, ecode: "EXP-2026-001" },
    shipment: { id: 3, reference: "OUT-2026-0005" },
    organization: { id: 1, name: "Northern Genetics Inc." },
    location: "Vault A",
    toStage: "FLOWERING",
  });

export const GET = empty;
export const POST = accepted;
export const PATCH = accepted;
export const PUT = accepted;
export const DELETE = accepted;
