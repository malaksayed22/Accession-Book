import { NextResponse } from "next/server";
import { CULTIVARS, EXPERIMENTS, matches, UNITS } from "@/features/mock/data";

// MOCK: record lookup behind the command palette (Ctrl+K).
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  return NextResponse.json({
    units: UNITS.filter((u) => matches(q, u.name))
      .slice(0, 6)
      .map((u) => ({ id: u.id, name: u.name, type: u.type })),
    experiments: EXPERIMENTS.filter((e) => matches(q, e.ecode, e.name))
      .slice(0, 4)
      .map((e) => ({ id: e.id, ecode: e.ecode, name: e.name })),
    cultivars: CULTIVARS.filter((c) => matches(q, c.name, c.code))
      .slice(0, 4)
      .map((c) => ({ id: c.id, name: c.name })),
  });
}
