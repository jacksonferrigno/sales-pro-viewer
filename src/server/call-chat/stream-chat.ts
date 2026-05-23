import "server-only";

import OpenAI from "openai";

import { buildCallChatSystemContent } from "@/server/call-chat/build-system-content";
import type { DashboardRow } from "@/server/dashboard/types";

const MAX_MESSAGES = 24;
const MAX_CONTENT_LEN = 12_000;

export type ChatTurn = { role: "user" | "assistant"; content: string };

export function validateChatMessages(raw: unknown): ChatTurn[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length > MAX_MESSAGES) return null;

  const out: ChatTurn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const r = item as Record<string, unknown>;
    if (r.role !== "user" && r.role !== "assistant") return null;
    if (typeof r.content !== "string") return null;
    if (r.content.length > MAX_CONTENT_LEN) return null;
    out.push({ role: r.role, content: r.content });
  }
  return out;
}

export async function streamCallChat(params: {
  apiKey: string;
  model: string;
  row: DashboardRow;
  messages: ChatTurn[];
}): Promise<Response> {
  const { apiKey, model, row, messages } = params;

  const systemContent = buildCallChatSystemContent(row.call, row.analysis);
  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const client = new OpenAI({ apiKey });
  const stream = await client.chat.completions.create({
    model,
    messages: openaiMessages,
    stream: true,
    max_completion_tokens: 2048,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const token = chunk.choices[0]?.delta?.content ?? "";
          if (token) controller.enqueue(encoder.encode(token));
        }
      } catch (err) {
        controller.error(err);
        return;
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
