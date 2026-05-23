import { NextResponse } from "next/server";

import { getServerLabel } from "@/server";

export function GET() {
  return NextResponse.json({ ok: true, scope: getServerLabel() });
}
