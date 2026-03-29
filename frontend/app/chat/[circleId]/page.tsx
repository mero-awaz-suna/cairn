"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api-base";
import { getStoredToken } from "@/lib/auth-client";
import styles from "./page.module.css";

type EnterChatResponse = {
  status?: string;
  circle_id?: string;
  chat?: {
    ws_path?: string;
  };
  detail?: string;
};

type HistoryItem = {
  id?: string;
  content?: string;
  alias?: string;
  role?: string;
  created_at?: string;
};

type WsPayload = {
  type?: string;
  message_id?: string;
  alias?: string;
  role?: string;
  content?: string;
  timestamp?: string;
  messages?: HistoryItem[];
};

type ChatMessage = {
  id: string;
  alias: string;
  role?: string;
  content: string;
  timestamp?: string;
  kind: "text" | "system";
};

function buildWebSocketUrl(wsPath: string, token: string) {
  const apiBase = getApiBaseUrl();
  const base = new URL(apiBase);
  base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  return `${base.origin}${wsPath}?token=${encodeURIComponent(token)}`;
}

function normalizeHistory(items: HistoryItem[] = []): ChatMessage[] {
  return items.map((message, index) => ({
    id: message.id ?? `history-${index}`,
    alias: message.alias ?? "anonymous",
    role: message.role ?? undefined,
    content: message.content ?? "",
    timestamp: message.created_at,
    kind: "text",
  }));
}

export default function CircleChatPage() {
  const params = useParams<{ circleId: string }>();
  const circleId = useMemo(() => decodeURIComponent(params?.circleId ?? ""), [params]);

  const wsRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isConnecting, setIsConnecting] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;

    async function connect() {
      if (!circleId) {
        setError("Missing circle id.");
        setIsConnecting(false);
        return;
      }

      const token = getStoredToken();
      if (!token) {
        setError("Please log in again to enter chat.");
        setIsConnecting(false);
        return;
      }

      setIsConnecting(true);
      setError("");

      try {
        const enterResponse = await fetch(`/api/circles/${encodeURIComponent(circleId)}/chatroom/enter`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        const enterData = (await enterResponse.json().catch(() => null)) as EnterChatResponse | null;
        if (!enterResponse.ok) {
          throw new Error(enterData?.detail ?? "Unable to enter chat room.");
        }

        const wsPath = enterData?.chat?.ws_path ?? `/chat/ws/${encodeURIComponent(circleId)}`;
        const ws = new WebSocket(buildWebSocketUrl(wsPath, token));
        wsRef.current = ws;

        ws.onmessage = (event) => {
          let payload: WsPayload;
          try {
            payload = JSON.parse(event.data) as WsPayload;
          } catch {
            return;
          }

          if (payload.type === "history") {
            setMessages(normalizeHistory(payload.messages ?? []));
            return;
          }

          if (payload.type === "text") {
            setMessages((current) => [
              ...current,
              {
                id: payload.message_id ?? `live-${Date.now()}`,
                alias: payload.alias ?? "anonymous",
                role: payload.role ?? undefined,
                content: payload.content ?? "",
                timestamp: payload.timestamp,
                kind: "text",
              },
            ]);
            return;
          }

          if (payload.type === "system") {
            setMessages((current) => [
              ...current,
              {
                id: `system-${Date.now()}`,
                alias: "system",
                content: payload.content ?? "",
                timestamp: payload.timestamp,
                kind: "system",
              },
            ]);
          }
        };

        ws.onerror = () => {
          if (!disposed) {
            setError("Chat connection error. Please retry.");
          }
        };

        ws.onclose = (event) => {
          if (!disposed && event.code !== 1000) {
            setError(event.reason || "Chat connection closed.");
          }
        };
      } catch (connectionError) {
        if (!disposed) {
          setError(
            connectionError instanceof Error
              ? connectionError.message
              : "Unable to connect to chat room.",
          );
        }
      } finally {
        if (!disposed) {
          setIsConnecting(false);
        }
      }
    }

    void connect();

    return () => {
      disposed = true;
      wsRef.current?.close(1000, "leaving");
      wsRef.current = null;
    };
  }, [circleId]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content) {
      return;
    }

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setError("Chat socket is not connected yet.");
      return;
    }

    setIsSending(true);
    setError("");

    try {
      ws.send(JSON.stringify({ type: "text", content }));
      setDraft("");
    } catch {
      setError("Unable to send message right now.");
    } finally {
      setIsSending(false);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const form = event.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  }

  function handleExitChatRoom() {
    window.location.href = "/?view=viewMyCircle";
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Circle Chat Room</h1>
            <p className={styles.subtitle}>Circle: {circleId || "unknown"}</p>
          </div>
          <button type="button" className={styles.exitButton} onClick={handleExitChatRoom}>
            Exit Chat Room
          </button>
        </header>

        {isConnecting ? <p className={styles.info}>Connecting to chat...</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.feed}>
          {messages.length === 0 ? (
            <p className={styles.info}>No messages yet. Say hello to your circle.</p>
          ) : (
            messages.map((message) => (
              <article
                key={message.id}
                className={`${styles.message} ${message.kind === "system" ? styles.systemMessage : ""}`}
              >
                <p className={styles.messageMeta}>
                  <strong>{message.alias}</strong>
                  {message.role ? ` · ${message.role}` : ""}
                  {message.timestamp ? ` · ${new Date(message.timestamp).toLocaleTimeString()}` : ""}
                </p>
                <p className={styles.messageBody}>{message.content}</p>
              </article>
            ))
          )}
        </div>

        <form onSubmit={(event) => void handleSend(event)} className={styles.composer}>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Type your message..."
            className={styles.input}
            rows={2}
            maxLength={1200}
          />
          <button type="submit" className={styles.button} disabled={isSending}>
            {isSending ? "Sending..." : "Send"}
          </button>
        </form>
      </section>
    </main>
  );
}
