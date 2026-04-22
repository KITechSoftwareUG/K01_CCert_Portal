import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o";
const MAX_ITERATIONS = 6;

// ─── Schema-Wissen für die KI ─────────────────────────────────────────────────

const DB_SCHEMA = `
DATENBANK-SCHEMA (PostgreSQL, Schema: public)

TABELLEN:
clients           – id, name, client_number, contact_person, email, phone, country, is_active, consultant_id, parent_id
audits            – id, client_id, client_certification_id (nullable), type, status, scheduled_date, notes, auditor_id, certification_body_id
audit_tasks       – id, audit_id, title, description, status, due_date, assigned_to
client_certifications – id, client_id, certification_id, certification_body_id, auditor_id, status, valid_from, valid_until, certificate_number, scope
certifications    – id, name, description                          (Mastertabelle: ISO 9001, FSC, PEFC, SURE, ISCC, …)
certification_bodies – id, name, short_name, contact_person, email, phone
auditors          – id, name, email, phone, certification_body_id
contacts          – id, client_id, name, role, email, phone, is_primary
consultants       – id, name, email

ENUM-WERTE:
audit_type:   initial | surveillance | recertification | six-month | internal | training
audit_status: scheduled | in-progress | completed | cancelled
task_status:  pending | in-progress | completed | overdue

WICHTIGE JOINS:
– audits.client_id → clients.id
– audits.auditor_id → auditors.id
– audits.client_certification_id → client_certifications.id
– audit_tasks.audit_id → audits.id
– client_certifications.client_id → clients.id
– client_certifications.certification_id → certifications.id
– client_certifications.auditor_id → auditors.id
– auditors.certification_body_id → certification_bodies.id
`.trim();

const buildSystemPrompt = (appBaseUrl: string, todayStr: string) => `
Du bist ein intelligenter Assistent im Zertifizierungs-Management-System von CERT CONSULTING PANE.
Heute: ${todayStr}

DEINE ARBEITSWEISE:
1. Verstehe die Absicht der Nachricht
2. Führe SQL-Abfragen auf der Datenbank aus um die benötigten Daten zu holen
3. Führe bei Bedarf mehrere Abfragen aus (Schritt für Schritt) bis du alle Daten hast
4. Antworte präzise auf Basis der echten Daten

${DB_SCHEMA}

WICHTIGE GESCHÄFTSLOGIK (korrekte SQL-Muster):
- Überfällige Aufgaben:  due_date < CURRENT_DATE AND status IN ('pending', 'in-progress')
  → NICHT status = 'overdue' — der Enum-Wert wird in der App kaum gesetzt
- Offene Audits:        status IN ('scheduled', 'in-progress')
- Ablaufende Zertifikate: valid_until BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
- Heutiges Datum für SQL: CURRENT_DATE (kein String)

REGELN:
- Nutze IMMER das execute_sql Tool wenn die Frage Daten betrifft — erfinde nie etwas
- Füge immer LIMIT (max. 50) zu deinen Abfragen hinzu
- Bei überfälligen oder kritischen Einträgen: ⚠️ hervorheben
- Antworten: Deutsch, kurz, direkt, Markdown erlaubt
- Wenn eine Abfrage keine Daten liefert: sag das klar

LINK-FORMAT (nutze echte IDs aus den Abfrage-Ergebnissen):
- Audit: [Audit öffnen](${appBaseUrl}/audits/{id})
- Kunde: [{name}](${appBaseUrl}/clients/{id})
`.trim();

// ─── Tool Definition ──────────────────────────────────────────────────────────

const TOOLS = [
  {
    type: "function",
    function: {
      name: "execute_sql",
      description:
        "Führt eine PostgreSQL SELECT-Abfrage auf der Datenbank aus und gibt die Ergebnisse zurück. Nutze dieses Tool um beliebige Daten zu suchen und abzufragen. Du kannst mehrere Abfragen hintereinander ausführen.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Eine gültige PostgreSQL SELECT-Abfrage. Immer mit LIMIT (max. 50).",
          },
        },
        required: ["query"],
      },
    },
  },
];

// ─── Message types ────────────────────────────────────────────────────────────

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: string } };

interface IncomingMessage {
  role: string;
  content: string | ContentPart[];
}

const toOpenAIMessages = (msgs: IncomingMessage[]) =>
  msgs
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: Array.isArray(m.content) ? m.content : String(m.content),
    }));

// ─── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": CORS_HEADERS,
  };

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ALLOWED_ORIGIN = (Deno.env.get("ALLOWED_ORIGIN") ?? "").trim();
    if (ALLOWED_ORIGIN) corsHeaders["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    // Auth check
    const authSupabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: authErr } = await authSupabase.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Ungültiger Token." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub;
    const { messages } = await req.json();
    const userMessages = (Array.isArray(messages) ? messages : []).slice(-10) as IncomingMessage[];

    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = new Date();
    const todayStr = now.toLocaleDateString("de-DE");
    const requestOrigin = req.headers.get("origin")?.trim() ?? "";
    const appBaseUrl = ALLOWED_ORIGIN && requestOrigin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "";
    const systemPrompt = buildSystemPrompt(appBaseUrl, todayStr);

    // ─── Agentic Loop ─────────────────────────────────────────────────────────
    const callMessages: unknown[] = [
      { role: "system", content: systemPrompt },
      ...toOpenAIMessages(userMessages),
    ];

    let finalContent = "";
    const queriesExecuted: string[] = [];

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      const res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: callMessages,
          tools: TOOLS,
          tool_choice: iter === MAX_ITERATIONS - 1 ? "none" : "auto", // force answer on last iteration
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error(`OpenAI error (iter ${iter}):`, res.status, err);
        if (res.status === 429) {
          return new Response(JSON.stringify({ error: "Zu viele Anfragen. Bitte warten." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`OpenAI ${res.status}`);
      }

      const data = await res.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) throw new Error("Keine Antwort von OpenAI");

      callMessages.push(msg);

      // No tool calls → final answer
      if (!msg.tool_calls?.length) {
        finalContent = msg.content ?? "";
        break;
      }

      // Execute tool calls
      for (const tc of msg.tool_calls) {
        const args = JSON.parse(tc.function.arguments || "{}");
        const query = String(args.query ?? "");
        queriesExecuted.push(query);

        console.log(`[Agent] User:${userId} iter:${iter} SQL: ${query.slice(0, 120)}`);

        let toolResult: string;
        try {
          // Safety: only SELECT
          if (!query.trim().toLowerCase().startsWith("select")) {
            toolResult = "Fehler: Nur SELECT-Abfragen erlaubt.";
          } else {
            const { data: sqlData, error: sqlErr } = await supabase.rpc("chat_execute_sql", { query });
            if (sqlErr) {
              console.error("SQL error:", sqlErr.message);
              toolResult = `SQL-Fehler: ${sqlErr.message}`;
            } else {
              const rows = Array.isArray(sqlData) ? sqlData : (sqlData ?? []);
              toolResult = rows.length === 0
                ? "Keine Ergebnisse gefunden."
                : JSON.stringify(rows);
            }
          }
        } catch (e) {
          toolResult = `Fehler: ${e instanceof Error ? e.message : "unbekannt"}`;
        }

        callMessages.push({ role: "tool", tool_call_id: tc.id, content: toolResult });
      }
    }

    // ─── Stream final answer ──────────────────────────────────────────────────
    const agentMeta = JSON.stringify({
      agent: { id: "assistant", name: "Assistent", icon: "🤖" },
      queries_executed: queriesExecuted.length,
    });
    const metaEvent = new TextEncoder().encode(`event: agent_meta\ndata: ${agentMeta}\n\n`);

    // If we have a collected final answer (non-streaming), emit it as SSE
    if (finalContent) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(metaEvent);
          const chunk = JSON.stringify({ choices: [{ delta: { content: finalContent } }] });
          controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    // Fallback: one more streaming call for the final answer
    const streamRes = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, messages: callMessages, stream: true }),
    });

    if (!streamRes.ok) {
      throw new Error(`Stream call failed: ${streamRes.status}`);
    }

    const aiStream = streamRes.body!;
    const combinedStream = new ReadableStream({
      async start(controller) {
        controller.enqueue(metaEvent);
        const reader = aiStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(combinedStream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("chat-assistant error:", e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ error: "Interner Fehler. Bitte erneut versuchen." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
