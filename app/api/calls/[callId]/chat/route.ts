import { NextResponse } from "next/server";

import appConfig from "@/config/app.config";
import {
  streamCallChat,
  validateChatMessages,
} from "@/server/call-chat/stream-chat";
import { loadCallDetail } from "@/server/dashboard/load-call-detail";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  context: { params: Promise<{ callId: string }> },
) {
  const { callId } = await context.params;
  const decodedId = decodeURIComponent(callId);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed =
    body && typeof body === "object" && "messages" in body
      ? validateChatMessages((body as { messages: unknown }).messages)
      : null;

  if (
    !parsed ||
    parsed.length === 0 ||
    parsed[parsed.length - 1]?.role !== "user"
  ) {
    return NextResponse.json(
      { error: "messages must be non-empty with user last" },
      { status: 400 },
    );
  }

  const row = await loadCallDetail(decodedId);
  if (!row) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }

  const cfg = appConfig();
  const apiKey = cfg.openai.apiKey.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 503 },
    );
  }

  return streamCallChat({
    apiKey,
    model: cfg.openai.model,
    row,
    messages: parsed,
  });
}
