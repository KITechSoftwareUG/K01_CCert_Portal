import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const AGENT_MODEL = "gpt-4o";

// ─── System Prompt ─────────────────────────────────────────────────────────────

const buildSystemPrompt = (appBaseUrl: string, todayStr: string) => `
Du bist ein intelligenter Assistent im Zertifizierungs-Management-System von CERT CONSULTING PANE.
Heute: ${todayStr}

DEINE ARBEITSWEISE:
1. Verstehe die Absicht der Nachricht des Nutzers
2. Rufe gezielt die passenden Daten-Tools auf um aktuelle Daten aus der Datenbank zu holen
3. Antworte präzise auf Basis der zurückgegebenen echten Daten

REGELN:
- Rufe IMMER Tools auf, wenn die Frage Daten betrifft — erfinde nie etwas
- Bei überfälligen oder kritischen Einträgen: ⚠️ hervorheben
- Antworten: Deutsch, kurz, direkt, Markdown erlaubt
- Wenn ein Tool keine Daten zurückgibt: sag das klar

LINK-FORMAT (nutze echte IDs aus den Tool-Ergebnissen):
- Audit: [Audit öffnen](${appBaseUrl}/audits/{id})
- Kunde: [{name}](${appBaseUrl}/clients/{id})
`.trim();

// ─── Tool Definitions ──────────────────────────────────────────────────────────

const DATA_TOOLS = [
  {
    type: "function",
    function: {
      name: "search_audits",
      description:
        "Suche nach Audits in der Datenbank. Nutze dieses Tool für alle Fragen zu Audits, Terminen, Audit-Status und Auditplanung.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["scheduled", "in-progress", "completed", "cancelled"],
            description: "Filter nach Audit-Status. 'scheduled' = geplant/offen.",
          },
          type: {
            type: "string",
            description:
              "Filter nach Audit-Typ: initial, surveillance, recertification, six-month, internal, training",
          },
          date_from: { type: "string", description: "Nur Audits ab diesem Datum (ISO 8601, z.B. 2026-04-01)" },
          date_to: { type: "string", description: "Nur Audits bis zu diesem Datum (ISO 8601)" },
          client_name: { type: "string", description: "Filter nach Kundenname (Teilstring, Groß/Klein egal)" },
          limit: { type: "integer", description: "Max. Anzahl Ergebnisse (Standard: 25)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_tasks",
      description:
        "Suche nach Aufgaben (audit_tasks). Nutze dieses Tool für Fragen zu offenen Aufgaben, Fristen, überfälligen Tasks und To-Dos.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["pending", "in-progress", "completed"],
            description: "Filter nach Aufgaben-Status",
          },
          overdue_only: {
            type: "boolean",
            description: "Wenn true: nur überfällige Aufgaben (Fälligkeit vergangen, nicht abgeschlossen)",
          },
          client_name: { type: "string", description: "Filter nach Kundenname (Teilstring)" },
          assigned_to: { type: "string", description: "Filter nach zugewiesener Person" },
          limit: { type: "integer", description: "Max. Anzahl Ergebnisse (Standard: 25)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_certifications",
      description:
        "Suche nach Kundenzertifizierungen. Nutze dieses Tool für Fragen zu Zertifikaten, Gültigkeiten, ablaufenden Zertifikaten und Normen.",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "Filter nach Kundenname (Teilstring)" },
          standard: {
            type: "string",
            description: "Filter nach Zertifizierungsstandard (ISO 9001, ISO 14001, FSC, PEFC, SURE, ISCC)",
          },
          expiring_within_days: {
            type: "integer",
            description: "Nur Zertifizierungen die in X Tagen ablaufen (z.B. 90 für 3 Monate)",
          },
          status: { type: "string", description: "Filter nach Status der Zertifizierung" },
          limit: { type: "integer", description: "Max. Anzahl Ergebnisse (Standard: 25)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_clients",
      description: "Suche nach Kunden anhand Name oder Kundennummer.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Suchbegriff: Kundenname oder Kundennummer (Teilstring)" },
          is_active: { type: "boolean", description: "true = nur aktive Kunden, false = nur inaktive" },
          limit: { type: "integer", description: "Max. Anzahl Ergebnisse (Standard: 25)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_client_details",
      description:
        "Vollständige Details zu einem bestimmten Kunden: Zertifizierungen, Audits, offene Aufgaben und Kontakte.",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "Kundenname (Teilstring)" },
          client_id: { type: "string", description: "Kunden-ID (UUID) — wenn bekannt" },
        },
      },
    },
  },
];

// ─── Tool Execution ────────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  supabase: SupabaseClient,
  now: Date,
): Promise<string> {
  const limit = Math.min(Number(args.limit) || 25, 50);

  try {
    switch (name) {
      case "search_audits": {
        let q = supabase
          .from("audits")
          .select(
            `id, type, status, scheduled_date, notes,
             clients(id, name, client_number),
             auditors(id, name),
             certification_bodies(id, name, short_name),
             client_certifications(id, certifications(id, name))`,
          )
          .order("scheduled_date", { ascending: true })
          .limit(limit * 3);

        if (args.status) q = q.eq("status", String(args.status));
        if (args.type) q = q.eq("type", String(args.type));
        if (args.date_from) q = q.gte("scheduled_date", String(args.date_from));
        if (args.date_to) q = q.lte("scheduled_date", String(args.date_to));

        let { data } = await q;
        if (!data?.length) return "Keine Audits mit diesen Kriterien gefunden.";

        if (args.client_name) {
          const needle = String(args.client_name).toLowerCase();
          data = data.filter((a) => a.clients?.name?.toLowerCase().includes(needle));
        }

        data = data.slice(0, limit);
        if (!data.length) return "Keine Audits für diesen Kunden gefunden.";

        return JSON.stringify(
          data.map((a) => ({
            id: a.id,
            type: a.type,
            status: a.status,
            date: a.scheduled_date,
            client: a.clients?.name,
            client_id: a.clients?.id,
            auditor: a.auditors?.name,
            certification: a.client_certifications?.certifications?.name,
            cert_body: a.certification_bodies?.short_name || a.certification_bodies?.name,
            notes: a.notes || null,
          })),
        );
      }

      case "search_tasks": {
        let q = supabase
          .from("audit_tasks")
          .select(
            `id, title, description, status, due_date, assigned_to,
             audits(id, type, scheduled_date, clients(id, name))`,
          )
          .order("due_date", { ascending: true })
          .limit(limit * 3);

        if (args.status) q = q.eq("status", String(args.status));

        let { data } = await q;
        if (!data?.length) return "Keine Aufgaben mit diesen Kriterien gefunden.";

        if (args.overdue_only) {
          data = data.filter((t) => t.status !== "completed" && new Date(t.due_date) < now);
        }
        if (args.client_name) {
          const needle = String(args.client_name).toLowerCase();
          data = data.filter((t) => t.audits?.clients?.name?.toLowerCase().includes(needle));
        }
        if (args.assigned_to) {
          const needle = String(args.assigned_to).toLowerCase();
          data = data.filter((t) => t.assigned_to?.toLowerCase().includes(needle));
        }

        data = data.slice(0, limit);
        if (!data.length) return "Keine Aufgaben mit diesen Kriterien gefunden.";

        return JSON.stringify(
          data.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            due_date: t.due_date,
            overdue: t.status !== "completed" && new Date(t.due_date) < now,
            assigned_to: t.assigned_to || null,
            client: t.audits?.clients?.name,
            client_id: t.audits?.clients?.id,
            audit_id: t.audits?.id,
            description: t.description || null,
          })),
        );
      }

      case "search_certifications": {
        let q = supabase
          .from("client_certifications")
          .select(
            `id, status, valid_from, valid_until, certificate_number, scope,
             clients(id, name, client_number),
             certifications(id, name),
             auditors(id, name)`,
          )
          .order("valid_until", { ascending: true })
          .limit(limit * 3);

        if (args.status) q = q.eq("status", String(args.status));
        if (args.expiring_within_days) {
          const expiryDate = new Date(now.getTime() + Number(args.expiring_within_days) * 24 * 60 * 60 * 1000);
          q = q.lte("valid_until", expiryDate.toISOString()).gte("valid_until", now.toISOString());
        }

        let { data } = await q;
        if (!data?.length) return "Keine Zertifizierungen mit diesen Kriterien gefunden.";

        if (args.client_name) {
          const needle = String(args.client_name).toLowerCase();
          data = data.filter((c) => c.clients?.name?.toLowerCase().includes(needle));
        }
        if (args.standard) {
          const needle = String(args.standard).toLowerCase();
          data = data.filter((c) => c.certifications?.name?.toLowerCase().includes(needle));
        }

        data = data.slice(0, limit);
        if (!data.length) return "Keine Zertifizierungen mit diesen Kriterien gefunden.";

        return JSON.stringify(
          data.map((c) => ({
            id: c.id,
            client: c.clients?.name,
            client_id: c.clients?.id,
            standard: c.certifications?.name,
            status: c.status,
            valid_until: c.valid_until,
            days_until_expiry: c.valid_until
              ? Math.ceil((new Date(c.valid_until).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              : null,
            certificate_number: c.certificate_number || null,
            scope: c.scope || null,
            auditor: c.auditors?.name || null,
          })),
        );
      }

      case "search_clients": {
        let q = supabase
          .from("clients")
          .select("id, name, client_number, contact_person, email, phone, country, is_active, consultant")
          .limit(limit);

        if (typeof args.is_active === "boolean") q = q.eq("is_active", args.is_active);
        if (args.query) {
          const needle = String(args.query);
          q = q.or(`name.ilike.%${needle}%,client_number.ilike.%${needle}%`);
        }

        const { data } = await q;
        if (!data?.length) return "Keine Kunden gefunden.";
        return JSON.stringify(data);
      }

      case "get_client_details": {
        let clientId = args.client_id as string | undefined;

        if (!clientId && args.client_name) {
          const { data: found } = await supabase
            .from("clients")
            .select("id, name")
            .ilike("name", `%${String(args.client_name)}%`)
            .limit(1);
          clientId = found?.[0]?.id;
        }

        if (!clientId) return "Kunde nicht gefunden.";

        const { data: clientAudits } = await supabase.from("audits").select("id").eq("client_id", clientId);
        const auditIds = clientAudits?.map((a) => a.id) ?? [];

        const [clientRes, certsRes, auditsRes, tasksRes, contactsRes] = await Promise.all([
          supabase.from("clients").select("*").eq("id", clientId).single(),
          supabase
            .from("client_certifications")
            .select("id, status, valid_from, valid_until, certificate_number, scope, certifications(name), auditors(name)")
            .eq("client_id", clientId),
          supabase
            .from("audits")
            .select("id, type, status, scheduled_date, auditors(name), certification_bodies(name, short_name)")
            .eq("client_id", clientId)
            .order("scheduled_date", { ascending: false })
            .limit(10),
          auditIds.length > 0
            ? supabase
                .from("audit_tasks")
                .select("id, title, status, due_date, assigned_to")
                .in("audit_id", auditIds)
                .in("status", ["pending", "in-progress"])
                .limit(20)
            : Promise.resolve({ data: [] }),
          supabase.from("contacts").select("id, name, role, email, phone, is_primary").eq("client_id", clientId),
        ]);

        return JSON.stringify({
          client: clientRes.data,
          certifications: certsRes.data,
          recent_audits: auditsRes.data,
          open_tasks: tasksRes.data,
          contacts: contactsRes.data,
        });
      }

      default:
        return `Unbekanntes Tool: ${name}`;
    }
  } catch (e) {
    console.error(`Tool ${name} error:`, e);
    return `Fehler beim Ausführen des Tools ${name}.`;
  }
}

// ─── Message helpers ───────────────────────────────────────────────────────────

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: string } };

interface Message {
  role: string;
  content: string | ContentPart[];
}

const toOpenAIMessages = (msgs: Message[]) =>
  msgs
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: Array.isArray(m.content) ? m.content : String(m.content),
    }));

// ─── Main Handler ──────────────────────────────────────────────────────────────

const MAX_CHAT_HISTORY = 10;

serve(async (req) => {
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": CORS_ALLOWED_HEADERS,
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ALLOWED_ORIGIN = (Deno.env.get("ALLOWED_ORIGIN") ?? "").trim();
    if (ALLOWED_ORIGIN) corsHeaders["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert. Bitte melden Sie sich an." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const authSupabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authSupabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Ungültiger oder abgelaufener Token." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { messages } = await req.json();
    const recentMessages: Message[] = Array.isArray(messages) ? messages.slice(-MAX_CHAT_HISTORY) : [];

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const now = new Date();
    const todayStr = now.toLocaleDateString("de-DE");
    const requestOrigin = req.headers.get("origin")?.trim() ?? "";
    const appBaseUrl = ALLOWED_ORIGIN && requestOrigin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "";
    const systemPrompt = buildSystemPrompt(appBaseUrl, todayStr);

    // ─── Step 1: First call — AI decides which tools to use ────────────
    const firstRes = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: AGENT_MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...toOpenAIMessages(recentMessages)],
        tools: DATA_TOOLS,
        tool_choice: "auto",
      }),
    });

    if (!firstRes.ok) {
      const err = await firstRes.text();
      console.error("First call error:", firstRes.status, err);
      return new Response(JSON.stringify({ error: "Fehler bei der KI-Verarbeitung" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firstData = await firstRes.json();
    const assistantMsg = firstData.choices?.[0]?.message;
    const toolCalls = assistantMsg?.tool_calls ?? [];

    console.log(`[Agent] User: ${userId} | Tools called: ${toolCalls.map((t: { function: { name: string } }) => t.function.name).join(", ") || "none"}`);

    // ─── Step 2: Execute tool calls in parallel ────────────────────────
    const toolResults: { role: string; tool_call_id: string; content: string }[] = [];

    if (toolCalls.length > 0) {
      const execResults = await Promise.all(
        toolCalls.map(async (tc: { id: string; function: { name: string; arguments: string } }) => {
          const args = JSON.parse(tc.function.arguments || "{}");
          const result = await executeTool(tc.function.name, args, supabase, now);
          return { role: "tool" as const, tool_call_id: tc.id, content: result };
        }),
      );
      toolResults.push(...execResults);
    }

    // ─── Step 3: Stream final response ────────────────────────────────
    const agentMeta = JSON.stringify({
      agent: { id: "assistant", name: "Assistent", icon: "🤖" },
      tools_called: toolCalls.map((t: { function: { name: string } }) => t.function.name),
    });
    const metaEvent = new TextEncoder().encode(`event: agent_meta\ndata: ${agentMeta}\n\n`);

    // If no tools were called, the assistant already has the full answer — stream it as text
    if (toolCalls.length === 0) {
      const content = assistantMsg?.content ?? "";
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(metaEvent);
          // Emit as a single SSE chunk in OpenAI streaming format
          const chunk = JSON.stringify({ choices: [{ delta: { content } }] });
          controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // With tool results: second streaming call
    const finalMessages = [
      { role: "system", content: systemPrompt },
      ...toOpenAIMessages(recentMessages),
      assistantMsg,
      ...toolResults,
    ];

    const streamRes = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: AGENT_MODEL, messages: finalMessages, stream: true }),
    });

    if (!streamRes.ok) {
      if (streamRes.status === 429) {
        return new Response(JSON.stringify({ error: "Zu viele Anfragen. Bitte warten Sie einen Moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Fehler bei der KI-Verarbeitung" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    return new Response(combinedStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-assistant error:", e instanceof Error ? e.message : "unknown");
    return new Response(JSON.stringify({ error: "Interner Fehler. Bitte erneut versuchen." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
