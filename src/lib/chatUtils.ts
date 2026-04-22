import { supabase } from "@/integrations/supabase/client";
import type { ProcessedFile } from "@/lib/fileProcessor";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`;

export interface AgentInfo {
  id: string;
  name: string;
  icon: string;
}

type TextContent = { type: 'text'; text: string };
type ImageContent = { type: 'image_url'; image_url: { url: string; detail: 'auto' } };
type ContentPart = TextContent | ImageContent;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | ContentPart[];
}

interface StreamChatParams {
  messages: ChatMessage[];
  attachedFile?: ProcessedFile | null;
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  onAgentSelected?: (agent: AgentInfo, reasoning: string) => void;
}

function buildMessagesWithAttachment(
  messages: ChatMessage[],
  file: ProcessedFile | null | undefined,
): ChatMessage[] {
  if (!file) return messages;

  const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === 'user');
  if (lastUserIdx === -1) return messages;

  const realIdx = messages.length - 1 - lastUserIdx;
  const lastUser = messages[realIdx];
  const userText = typeof lastUser.content === 'string' ? lastUser.content : '';

  let updatedContent: string | ContentPart[];

  if (file.kind === 'image') {
    updatedContent = [
      { type: 'text', text: userText || 'Analysiere diese Datei.' },
      { type: 'image_url', image_url: { url: file.data, detail: 'auto' } },
    ];
  } else {
    const prefix = `[Anhang: ${file.name}]\n${file.data}\n\n`;
    updatedContent = prefix + (userText || 'Analysiere den Dateiinhalt.');
  }

  const updated: ChatMessage[] = [...messages];
  updated[realIdx] = { ...lastUser, content: updatedContent };
  return updated;
}

export async function streamChat({
  messages,
  attachedFile,
  onDelta,
  onDone,
  onError,
  onAgentSelected,
}: StreamChatParams) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      onError("Nicht angemeldet. Bitte melden Sie sich erneut an.");
      return;
    }

    const payload = buildMessagesWithAttachment(messages, attachedFile);

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ messages: payload }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      if (resp.status === 429) { onError("Zu viele Anfragen. Bitte warten Sie einen Moment."); return; }
      if (resp.status === 402) { onError("KI-Kontingent erschöpft. Bitte später erneut versuchen."); return; }
      if (resp.status === 401) { onError("Sitzung abgelaufen. Bitte melden Sie sich erneut an."); return; }
      onError((errorData as { error?: string }).error || "Fehler bei der Verarbeitung");
      return;
    }

    if (!resp.body) { onError("Keine Antwort vom Server"); return; }

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

          if (line.startsWith("event: ")) { currentEventType = line.slice(7).trim(); continue; }
          if (line.startsWith(":") || line.trim() === "") { if (line.trim() === "") currentEventType = ""; continue; }
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();

          if (currentEventType === "agent_meta") {
            try {
              const meta = JSON.parse(jsonStr) as { agent?: AgentInfo; reasoning?: string };
              if (meta.agent && onAgentSelected) onAgentSelected(meta.agent, meta.reasoning || "");
            } catch { /* ignore */ }
            currentEventType = "";
            continue;
          }

          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr) as { choices?: Array<{ delta?: { content?: string } }> };
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) onDelta(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }

        currentEventType = "";
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw || raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "" || raw.startsWith("event: ") || !raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          try {
            const parsed = JSON.parse(jsonStr) as { choices?: Array<{ delta?: { content?: string } }> };
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) onDelta(content);
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
