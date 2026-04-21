import { supabase } from "@/integrations/supabase/client";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`;

export interface AgentInfo {
  id: string;
  name: string;
  icon: string;
}

interface StreamChatParams {
  messages: { role: string; content: string }[];
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  onAgentSelected?: (agent: AgentInfo, reasoning: string) => void;
}

export async function streamChat({ messages, onDelta, onDone, onError, onAgentSelected }: StreamChatParams) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      onError("Nicht angemeldet. Bitte melden Sie sich erneut an.");
      return;
    }

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ messages }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      if (resp.status === 429) {
        onError("Zu viele Anfragen. Bitte warten Sie einen Moment.");
        return;
      }
      if (resp.status === 402) {
        onError("KI-Kontingent erschöpft. Bitte später erneut versuchen.");
        return;
      }
      if (resp.status === 401) {
        onError("Sitzung abgelaufen. Bitte melden Sie sich erneut an.");
        return;
      }
      onError(errorData.error || "Fehler bei der Verarbeitung");
      return;
    }

    if (!resp.body) {
      onError("Keine Antwort vom Server");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;
    let currentEventType = "";

    try {
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);

          if (line.startsWith("event: ")) {
            currentEventType = line.slice(7).trim();
            continue;
          }

          if (line.startsWith(":") || line.trim() === "") {
            if (line.trim() === "") currentEventType = "";
            continue;
          }
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();

          // Agent metadata event (custom, prepended by our edge function)
          if (currentEventType === "agent_meta") {
            try {
              const meta = JSON.parse(jsonStr);
              if (meta.agent && onAgentSelected) {
                onAgentSelected(meta.agent, meta.reasoning || "");
              }
            } catch { /* ignore */ }
            currentEventType = "";
            continue;
          }

          // Claude streaming format
          try {
            const parsed = JSON.parse(jsonStr);

            if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
              const text = parsed.delta.text as string;
              if (text) onDelta(text);
            } else if (parsed.type === "message_stop") {
              streamDone = true;
              break;
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }

        currentEventType = "";
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (raw.startsWith("event: ")) continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
              const text = parsed.delta.text as string;
              if (text) onDelta(text);
            }
          } catch { /* ignore */ }
        }
      }
    } finally {
      reader.cancel();
    }

    onDone();
  } catch (e) {
    console.error("Stream error:", e);
    onError("Verbindungsfehler. Bitte erneut versuchen.");
  }
}
