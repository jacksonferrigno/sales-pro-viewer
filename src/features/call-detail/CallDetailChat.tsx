"use client";

import { useCallback, useState, type KeyboardEvent } from "react";

import { toRichSegments } from "@/lib/analysis-rich-text";

import { CitationRichText } from "./CitationRichText";
import styles from "./call-detail.module.css";

type Turn = { role: "user" | "assistant"; content: string };

export function CallDetailChat({
  callId,
  transcriptLines,
}: {
  callId: string;
  transcriptLines: string[];
}) {
  const [messages, setMessages] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;

    const thread = [...messages, { role: "user" as const, content: text }];
    setMessages([...thread, { role: "assistant", content: "" }]);
    setInput("");
    setError(null);
    setBusy(true);

    const res = await fetch(`/api/calls/${encodeURIComponent(callId)}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: thread }),
    });

    if (!res.ok) {
      let msg = `Request failed (${res.status})`;
      try {
        const j = (await res.json()) as { error?: string };
        if (j.error) msg = j.error;
      } catch {
        /* ignore */
      }
      setError(msg);
      setMessages(thread);
      setBusy(false);
      return;
    }

    if (!res.body) {
      setError("No response body");
      setMessages(thread);
      setBusy(false);
      return;
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let acc = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages([...thread, { role: "assistant", content: acc }]);
      }
      acc += dec.decode();
      if (acc.length > 0) {
        setMessages([...thread, { role: "assistant", content: acc }]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Stream error");
      setMessages(thread);
    } finally {
      setBusy(false);
    }
  }, [busy, callId, input, messages]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <aside className={styles.chat} aria-label="Chat about this call">
      <div className={styles.chatHeader}>
        <p className={styles.chatTitle}>Chat</p>
      </div>

      <div className={styles.chatBody}>
        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={
              m.role === "user" ? styles.chatBubbleUser : styles.chatBubbleReply
            }
          >
            {m.role === "user" ? (
              m.content
            ) : !m.content && busy ? (
              "…"
            ) : (
              <CitationRichText
                segments={toRichSegments(m.content, transcriptLines)}
              />
            )}
          </div>
        ))}
        {error ? <p className={styles.chatError}>{error}</p> : null}
      </div>

      <div className={styles.chatComposer}>
        <textarea
          className={styles.chatTextarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Message…"
          rows={1}
          disabled={busy}
          aria-label="Message"
        />
        <button
          type="button"
          className={styles.chatSend}
          onClick={() => void send()}
          disabled={busy || !input.trim()}
          aria-label="Send"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M8 13V3M8 3L3.5 7.5M8 3L12.5 7.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </aside>
  );
}
