import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Domain record types ────────────────────────────────────────────────────────

interface Message {
  role: string;
  content: string;
}

interface ClientRecord {
  id: string;
  name: string;
  client_number: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  is_active: boolean;
  consultant: string | null;
}

interface AuditRecord {
  id: string;
  type: string;
  status: string;
  scheduled_date: string;
  notes: string | null;
  clients: { id: string; name: string; client_number: string | null } | null;
  auditors: { id: string; name: string } | null;
  certification_bodies: { id: string; name: string; short_name: string | null } | null;
  client_certifications: {
    id: string;
    certifications: { id: string; name: string } | null;
  } | null;
}

interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string;
  assigned_to: string | null;
  audits: {
    id: string;
    type: string;
    scheduled_date: string;
    status: string;
    clients: { id: string; name: string; client_number: string | null } | null;
  } | null;
}

interface ClientCertRecord {
  id: string;
  status: string | null;
  valid_from: string | null;
  valid_until: string | null;
  certificate_number: string | null;
  scope: string | null;
  clients: { id: string; name: string; client_number: string | null } | null;
  certifications: { id: string; name: string } | null;
  auditors: { id: string; name: string } | null;
}

interface AuditorRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  certification_bodies: { name: string; short_name: string | null } | null;
}

interface ContactRecord {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  clients: { id: string; name: string; client_number: string | null } | null;
}

interface CertBodyRecord {
  id: string;
  name: string;
  short_name: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
}

interface CertTypeRecord {
  id: string;
  name: string;
  description: string | null;
}

type SupabaseQueryBuilder = ReturnType<ReturnType<typeof createClient>["from"]>;

const CORS_ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

// ─── OpenAI config ─────────────────────────────────────────────────────────────

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const ROUTER_MODEL = "gpt-4o-mini";
const AGENT_MODEL = "gpt-4o";

// ─── Agent Definitions ─────────────────────────────────────────────────────────

interface AgentDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  getStaticInstructions: (appBaseUrl: string, todayStr: string) => string;
}

const AGENTS: Record<string, AgentDefinition> = {
  audit_expert: {
    id: "audit_expert",
    name: "Audit-Experte",
    icon: "📋",
    description: "Beantwortet Fragen zu Audits, Terminen, Status und Planung.",
    getStaticInstructions: (appBaseUrl, todayStr) => `Du bist Audit-Experte im Zertifizierungs-Management-Portal von CERT CONSULTING PANE.
Heute: ${todayStr}

AUFGABE: Beantworte Fragen zu Audits, Terminen, Auditplanung, Auditoren und Audit-Status.
Im nächsten Block folgt ein aktueller Datenbankausschnitt. Nutze ausschließlich diese Daten.

REGELN:
- Wenn ein Audit oder Kunde nicht im Kontext erscheint: "Dazu liegen mir gerade keine Daten vor – bitte direkt in der App nachschauen."
- Überfällige und dringende Termine proaktiv mit ⚠️ kennzeichnen
- Kurz, präzise, Deutsch, Markdown erlaubt
- Keine erfundenen Daten

LINKS (nur wenn ID bekannt):
- Audit: [Audit öffnen](${appBaseUrl}/audits/{audit-id})
- Kunde: [{name}](${appBaseUrl}/clients/{kunden-id})`,
  },

  certification_expert: {
    id: "certification_expert",
    name: "Zertifizierungs-Experte",
    icon: "🏅",
    description: "Spezialist für Zertifizierungen, Normen, Gültigkeiten und Zertifizierungsstellen.",
    getStaticInstructions: (appBaseUrl, todayStr) => `Du bist Zertifizierungs-Experte im Zertifizierungs-Management-Portal von CERT CONSULTING PANE.
Heute: ${todayStr}

AUFGABE: Beantworte Fragen zu Zertifizierungen (SURE, FSC, PEFC, ISCC, ISO 9001, ISO 14001), Gültigkeiten, Zertifizierungsstellen und Normen.
Im nächsten Block folgt ein aktueller Datenbankausschnitt. Nutze ausschließlich diese Daten.

REGELN:
- Bald ablaufende Zertifizierungen (< 90 Tage) mit ⚠️ hervorheben
- Wenn eine Zertifizierung nicht im Kontext: "Dazu liegen mir gerade keine Daten vor."
- Kurz, präzise, Deutsch, Markdown erlaubt
- Keine erfundenen Daten

LINKS (nur wenn ID bekannt):
- Kunde: [{name}](${appBaseUrl}/clients/{kunden-id})
- Audit: [Audit öffnen](${appBaseUrl}/audits/{audit-id})`,
  },

  task_manager: {
    id: "task_manager",
    name: "Aufgaben-Manager",
    icon: "✅",
    description: "Verwaltet und informiert über Aufgaben, Fristen und To-Dos.",
    getStaticInstructions: (appBaseUrl, todayStr) => `Du bist Aufgaben-Manager im Zertifizierungs-Management-Portal von CERT CONSULTING PANE.
Heute: ${todayStr}

AUFGABE: Beantworte Fragen zu Aufgaben, Fristen, offenen To-Dos und Priorisierung.
Im nächsten Block folgt ein aktueller Datenbankausschnitt. Nutze ausschließlich diese Daten.

REGELN:
- Überfällige Aufgaben immer als erstes nennen und mit ⚠️ markieren
- Wenn eine Aufgabe nicht im Kontext: "Dazu liegen mir gerade keine Daten vor."
- Bei Listen: nach Fälligkeit sortieren
- Kurz, präzise, Deutsch, Markdown erlaubt
- Keine erfundenen Daten

LINKS (nur wenn ID bekannt):
- Audit (Aufgaben-Kontext): [Audit öffnen](${appBaseUrl}/audits/{audit-id})
- Kunde: [{name}](${appBaseUrl}/clients/{kunden-id})`,
  },

  client_advisor: {
    id: "client_advisor",
    name: "Kunden-Berater",
    icon: "👥",
    description: "Experte für Kundendaten, Kontakte und Kundenbeziehungen.",
    getStaticInstructions: (appBaseUrl, todayStr) => `Du bist Kunden-Berater im Zertifizierungs-Management-Portal von CERT CONSULTING PANE.
Heute: ${todayStr}

AUFGABE: Beantworte Fragen zu Kundendaten, Kontakten, Ansprechpartnern und Kundenbeziehungen.
Im nächsten Block folgt ein aktueller Datenbankausschnitt. Nutze ausschließlich diese Daten.

REGELN:
- Wenn ein Kunde nicht im Kontext: "Dazu liegen mir gerade keine Daten vor."
- Kundennummer immer mit angeben wenn vorhanden
- Kurz, präzise, Deutsch, Markdown erlaubt
- Keine erfundenen Daten

LINKS (nur wenn ID bekannt):
- Kunde: [{name}](${appBaseUrl}/clients/{kunden-id})`,
  },

  general_assistant: {
    id: "general_assistant",
    name: "Assistent",
    icon: "💬",
    description: "Allgemeiner Assistent für übergreifende Fragen.",
    getStaticInstructions: (appBaseUrl, todayStr) => `Du bist KI-Assistent im Zertifizierungs-Management-Portal von CERT CONSULTING PANE.
Heute: ${todayStr}

Im nächsten Block folgt ein aktueller Datenbankausschnitt. Nutze ausschließlich diese Daten für konkrete Fragen.

REGELN:
- Nur echte Daten aus dem Kontext verwenden — nie erfinden
- Wenn Daten fehlen: klar sagen statt raten
- Kurz, direkt, kollegial, Deutsch, Markdown erlaubt

LINKS (nur wenn ID bekannt):
- Kunde: [{name}](${appBaseUrl}/clients/{kunden-id})
- Audit: [Audit öffnen](${appBaseUrl}/audits/{audit-id})`,
  },
};

// ─── Router ────────────────────────────────────────────────────────────────────

const ROUTER_SYSTEM_PROMPT = `Du bist ein Router in einem Zertifizierungs-Management-System. Weise jede Anfrage dem passenden Agenten zu.

Agenten:
- audit_expert: Audits, Audit-Termine, Auditplanung, Auditoren, Audit-Status
- certification_expert: Zertifizierungen, ISO, FSC, PEFC, SURE, ISCC, Gültigkeiten, Zertifizierungsstellen
- task_manager: Aufgaben, To-Dos, Fristen, überfällige Tasks
- client_advisor: Kunden, Kontakte, Firmen, Ansprechpartner
- general_assistant: Begrüßungen, allgemeine Fragen, alles andere`;

const ROUTER_TOOL = {
  type: "function",
  function: {
    name: "route_to_agent",
    description: "Route die Anfrage zum passenden Agenten",
    parameters: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          enum: ["audit_expert", "certification_expert", "task_manager", "client_advisor", "general_assistant"],
          description: "ID des passenden Agenten",
        },
        reasoning: {
          type: "string",
          description: "Kurze Begründung (1 Satz)",
        },
      },
      required: ["agent_id", "reasoning"],
      additionalProperties: false,
    },
  },
};

const toClaudeMessages = (msgs: Message[]) => {
  const filtered = msgs
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content) }));
  const start = filtered.findIndex((m) => m.role === "user");
  return start >= 0 ? filtered.slice(start) : filtered;
};

async function routeToAgent(messages: Message[], apiKey: string): Promise<{ agentId: string; reasoning: string }> {
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ROUTER_MODEL,
        messages: [{ role: "system", content: ROUTER_SYSTEM_PROMPT }, ...toClaudeMessages(messages.slice(-3))],
        tools: [ROUTER_TOOL],
        tool_choice: { type: "function", function: { name: "route_to_agent" } },
      }),
    });

    if (!response.ok) {
      console.error("Router error:", response.status);
      return { agentId: "general_assistant", reasoning: "Router-Fallback" };
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const args = JSON.parse(toolCall.function.arguments);
      return {
        agentId: args.agent_id || "general_assistant",
        reasoning: args.reasoning || "",
      };
    }
    return { agentId: "general_assistant", reasoning: "Keine Tool-Antwort" };
  } catch (e) {
    console.error("Router exception:", e);
    return { agentId: "general_assistant", reasoning: "Router-Fehler" };
  }
}

// ─── Data Fetching ─────────────────────────────────────────────────────────────

const MAX_CHAT_HISTORY = 8;
const MAX_CLIENTS = 20;
const MAX_AUDITS = 20;
const MAX_TASKS = 20;
const MAX_CERTIFICATIONS = 15;
const MAX_AUDITORS = 12;
const MAX_CONTACTS = 12;
const MAX_CERT_BODIES = 10;

const normalize = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractKeywords = (text: string) => {
  const stopWords = new Set([
    "der", "die", "das", "und", "oder", "ein", "eine", "einer", "einem", "einen",
    "dem", "den", "des", "ich", "du", "wir", "ihr", "sie", "er", "es", "mit",
    "von", "für", "bei", "zu", "im", "in", "am", "auf", "an", "ist", "sind",
    "war", "waren", "bitte", "zeige", "gib", "mir", "alle", "den", "zur", "zum",
    "nach", "vor", "über", "unter", "welche", "welcher", "welches", "was", "wie",
    "wann", "wo", "kurz", "sehr", "max", "sätze", "satze", "freundliche",
    "formellen", "floskeln", "beginne", "gibt", "hat", "haben", "hatte", "hatten",
    "noch", "auch", "schon", "nicht", "kein", "keine", "keiner", "keinem", "keinen",
    "dann", "denn", "aber", "wenn", "dass", "damit", "weil", "doch", "mal",
  ]);

  return Array.from(
    new Set(
      normalize(text)
        .split(/[^a-z0-9äöüß-]+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 3 && !stopWords.has(word)),
    ),
  );
};

const scoreByKeywords = (haystack: string, keywords: string[]) => {
  if (!keywords.length) return 0;
  const text = normalize(haystack);
  return keywords.reduce((score, keyword) => {
    if (!keyword) return score;
    const regex = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "g");
    const matches = text.match(regex);
    return score + (matches?.length ?? 0);
  }, 0);
};

const limitAndSort = <T,>(
  items: T[],
  limit: number,
  scoreFn: (item: T) => number,
  fallbackSort?: (a: T, b: T) => number,
) => {
  return [...items]
    .map((item) => ({ item, score: scoreFn(item) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || (fallbackSort ? fallbackSort(a.item, b.item) : 0))
    .slice(0, limit)
    .map(({ item }) => item);
};

// ─── Main Handler ──────────────────────────────────────────────────────────────

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
      console.error("Auth validation failed:", claimsError);
      return new Response(JSON.stringify({ error: "Ungültiger oder abgelaufener Token." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { messages } = await req.json();
    const recentMessages = Array.isArray(messages) ? messages.slice(-MAX_CHAT_HISTORY) : [];

    // Extract keywords from ALL recent messages (not just the last one)
    // This makes follow-up questions work correctly
    const allRecentText = recentMessages.map((m: Message) => String(m.content)).join(" ");
    const keywords = extractKeywords(allRecentText);

    const latestUserText = String(
      [...recentMessages].reverse().find((m: Message) => m?.role === "user")?.content ?? "",
    );
    const normalizedLatestText = normalize(latestUserText);
    const isGreetingRequest =
      normalizedLatestText.includes("begru") || normalizedLatestText.includes("willkommen zuruck");

    // ─── Step 1: Route ─────────────────────────────────────────────────
    const routeResult = await routeToAgent(recentMessages, OPENAI_API_KEY);
    const agent = AGENTS[routeResult.agentId] || AGENTS.general_assistant;

    console.log(`[Router] User: ${userId} | Agent: ${agent.id} | Reason: ${routeResult.reasoning}`);

    // ─── Step 2: Fetch DB context ───────────────────────────────────────
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const now = new Date();
    const todayStr = now.toLocaleDateString("de-DE");

    // Always fetch all entity types — keyword matching must never gate data access
    const [
      clientsRes, auditsRes, tasksRes, clientCertsRes,
      auditorsRes, certBodiesRes, contactsRes, certTypesRes,
    ] = await Promise.all([
      supabase
        .from("clients")
        .select("id, name, client_number, contact_person, email, phone, country, is_active, consultant")
        .limit(100),
      supabase
        .from("audits")
        .select(`
          id, type, status, scheduled_date, notes,
          clients (id, name, client_number),
          auditors (id, name),
          certification_bodies (id, name, short_name),
          client_certifications (id, certifications (id, name))
        `)
        .order("scheduled_date", { ascending: true })
        .limit(100),
      supabase
        .from("audit_tasks")
        .select(`
          id, title, description, status, due_date, assigned_to,
          audits (id, type, scheduled_date, status, clients (id, name, client_number))
        `)
        .order("due_date", { ascending: true })
        .limit(100),
      supabase
        .from("client_certifications")
        .select(`
          id, status, valid_from, valid_until, certificate_number, scope,
          clients (id, name, client_number),
          certifications (id, name),
          auditors (id, name)
        `)
        .order("valid_until", { ascending: true })
        .limit(100),
      supabase
        .from("auditors")
        .select("id, name, email, phone, certification_bodies (name, short_name)")
        .limit(50),
      supabase
        .from("certification_bodies")
        .select("id, name, short_name, contact_person, email, phone")
        .limit(30),
      supabase
        .from("contacts")
        .select("id, name, role, email, phone, is_primary, clients (id, name, client_number)")
        .limit(50),
      supabase
        .from("certifications")
        .select("id, name, description")
        .limit(20),
    ]);

    const clients = clientsRes.data || [];
    const audits = auditsRes.data || [];
    const tasks = tasksRes.data || [];
    const clientCerts = clientCertsRes.data || [];
    const auditors = auditorsRes.data || [];
    const certBodies = certBodiesRes.data || [];
    const contacts = contactsRes.data || [];
    const certTypes = certTypesRes.data || [];

    const openTasks = (tasks as TaskRecord[]).filter((t) => t.status === "pending" || t.status === "in-progress");
    const overdueTasks = openTasks.filter((t) => new Date(t.due_date) < now);
    const upcomingAudits = (audits as AuditRecord[]).filter((a) => new Date(a.scheduled_date) >= now);

    const selectedClients = isGreetingRequest
      ? []
      : limitAndSort(
          clients as ClientRecord[],
          MAX_CLIENTS,
          (client) =>
            scoreByKeywords(
              `${client.name} ${client.client_number ?? ""} ${client.country ?? ""} ${client.consultant ?? ""} ${client.contact_person ?? ""}`,
              keywords,
            ),
          (a, b) => a.name.localeCompare(b.name),
        );

    const selectedAudits = [
      ...limitAndSort(
        audits as AuditRecord[],
        MAX_AUDITS,
        (audit) => {
          const certName = audit.client_certifications?.certifications?.name ?? "";
          const auditorName = audit.auditors?.name ?? "";
          const clientName = audit.clients?.name ?? "";
          return scoreByKeywords(`${clientName} ${audit.type} ${audit.status} ${certName} ${auditorName}`, keywords);
        },
        (a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime(),
      ),
      ...(isGreetingRequest ? upcomingAudits.slice(0, 8) : []),
    ]
      .filter(
        (audit: AuditRecord, index: number, array: AuditRecord[]) =>
          array.findIndex((item) => item.id === audit.id) === index,
      )
      .slice(0, MAX_AUDITS);

    const selectedTasks = [
      ...limitAndSort(
        tasks as TaskRecord[],
        MAX_TASKS,
        (task) => {
          const clientName = task.audits?.clients?.name ?? "";
          const auditType = task.audits?.type ?? "";
          return scoreByKeywords(
            `${task.title} ${task.description ?? ""} ${task.status} ${clientName} ${auditType} ${task.assigned_to ?? ""}`,
            keywords,
          );
        },
        (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
      ),
      ...(isGreetingRequest ? overdueTasks.slice(0, 8) : []),
    ]
      .filter(
        (task: TaskRecord, index: number, array: TaskRecord[]) =>
          array.findIndex((item) => item.id === task.id) === index,
      )
      .slice(0, MAX_TASKS);

    const relatedClientIds = new Set([
      ...(selectedClients as ClientRecord[]).map((c) => c.id),
      ...selectedAudits.map((a) => a.clients?.id).filter(Boolean),
      ...selectedTasks.map((t) => t.audits?.clients?.id).filter(Boolean),
    ]);

    const selectedClientCerts = [
      ...(clientCerts as ClientCertRecord[]).filter((cert) => relatedClientIds.has(cert.clients?.id)),
      ...limitAndSort(
        clientCerts as ClientCertRecord[],
        MAX_CERTIFICATIONS,
        (cert) => {
          const clientName = cert.clients?.name ?? "";
          const certName = cert.certifications?.name ?? "";
          const auditorName = cert.auditors?.name ?? "";
          return scoreByKeywords(
            `${clientName} ${certName} ${cert.status ?? ""} ${cert.scope ?? ""} ${cert.certificate_number ?? ""} ${auditorName}`,
            keywords,
          );
        },
        (a, b) => {
          const aTime = a.valid_until ? new Date(a.valid_until).getTime() : Number.MAX_SAFE_INTEGER;
          const bTime = b.valid_until ? new Date(b.valid_until).getTime() : Number.MAX_SAFE_INTEGER;
          return aTime - bTime;
        },
      ),
    ]
      .filter(
        (cert: ClientCertRecord, index: number, array: ClientCertRecord[]) =>
          array.findIndex((item) => item.id === cert.id) === index,
      )
      .slice(0, MAX_CERTIFICATIONS);

    const selectedAuditors = isGreetingRequest
      ? []
      : limitAndSort(
          auditors as AuditorRecord[],
          MAX_AUDITORS,
          (auditor) =>
            scoreByKeywords(
              `${auditor.name} ${auditor.email ?? ""} ${auditor.certification_bodies?.name ?? ""} ${auditor.certification_bodies?.short_name ?? ""}`,
              keywords,
            ),
          (a, b) => a.name.localeCompare(b.name),
        );

    const selectedContacts = isGreetingRequest
      ? []
      : (contacts as ContactRecord[])
          .filter((contact) => relatedClientIds.has(contact.clients?.id))
          .slice(0, MAX_CONTACTS);

    const selectedCertBodies = isGreetingRequest
      ? []
      : limitAndSort(
          certBodies as CertBodyRecord[],
          MAX_CERT_BODIES,
          (body) =>
            scoreByKeywords(
              `${body.name} ${body.short_name ?? ""} ${body.contact_person ?? ""} ${body.email ?? ""}`,
              keywords,
            ),
          (a, b) => a.name.localeCompare(b.name),
        );

    const selectedCertTypes = isGreetingRequest
      ? (certTypes as CertTypeRecord[]).slice(0, 8)
      : (certTypes as CertTypeRecord[])
          .filter((cert) => scoreByKeywords(cert.name, keywords) > 0 || keywords.length === 0)
          .slice(0, 8);

    // ─── Build DB context string ───────────────────────────────────────
    const ctx: string[] = [];
    ctx.push(`=== DATENBANKKONTEXT (Stand: ${todayStr}) ===`);
    ctx.push(`Gesamt: ${clients.length} Kunden · ${audits.length} Audits · ${tasks.length} Aufgaben · ${clientCerts.length} Kunden-Zertifizierungen`);
    ctx.push(`Offen: ${openTasks.length} Aufgaben · ${overdueTasks.length} überfällig · ${upcomingAudits.length} kommende Audits`);
    ctx.push(`HINWEIS: Dies ist ein gefilterter Ausschnitt. Wenn etwas nicht erscheint, liegt es außerhalb des aktuellen Kontexts.`);

    if (selectedCertTypes.length > 0) {
      ctx.push(`\n--- ZERTIFIZIERUNGSSTANDARDS (${selectedCertTypes.length}) ---`);
      selectedCertTypes.forEach((cert: CertTypeRecord) =>
        ctx.push(`· ${cert.name}${cert.description ? ` – ${cert.description}` : ""}`),
      );
    }
    if (selectedClients.length > 0) {
      ctx.push(`\n--- KUNDEN (${selectedClients.length}) ---`);
      selectedClients.forEach((client: ClientRecord) => {
        const parts = [client.name, `ID:${client.id}`];
        if (client.client_number) parts.push(`KD-Nr:${client.client_number}`);
        if (client.country) parts.push(`Land:${client.country}`);
        if (client.contact_person) parts.push(`AP:${client.contact_person}`);
        if (client.consultant) parts.push(`Berater:${client.consultant}`);
        parts.push(`Aktiv:${client.is_active ? "Ja" : "Nein"}`);
        ctx.push(`· ${parts.join(" | ")}`);
      });
    }
    if (selectedContacts.length > 0) {
      ctx.push(`\n--- KONTAKTE (${selectedContacts.length}) ---`);
      selectedContacts.forEach((contact: ContactRecord) => {
        const parts = [`${contact.name} (${contact.clients?.name ?? "?"})`];
        if (contact.role) parts.push(`Rolle:${contact.role}`);
        if (contact.email) parts.push(`E-Mail:${contact.email}`);
        if (contact.phone) parts.push(`Tel:${contact.phone}`);
        if (contact.is_primary) parts.push("Hauptkontakt");
        ctx.push(`· ${parts.join(" | ")}`);
      });
    }
    if (selectedAuditors.length > 0) {
      ctx.push(`\n--- AUDITOREN (${selectedAuditors.length}) ---`);
      selectedAuditors.forEach((auditor: AuditorRecord) => {
        const parts = [auditor.name];
        if (auditor.certification_bodies?.short_name || auditor.certification_bodies?.name)
          parts.push(`ZS:${auditor.certification_bodies?.short_name || auditor.certification_bodies?.name}`);
        if (auditor.email) parts.push(`E-Mail:${auditor.email}`);
        if (auditor.phone) parts.push(`Tel:${auditor.phone}`);
        ctx.push(`· ${parts.join(" | ")}`);
      });
    }
    if (selectedCertBodies.length > 0) {
      ctx.push(`\n--- ZERTIFIZIERUNGSSTELLEN (${selectedCertBodies.length}) ---`);
      selectedCertBodies.forEach((body: CertBodyRecord) => {
        const parts = [body.name];
        if (body.short_name) parts.push(`Kürzel:${body.short_name}`);
        if (body.contact_person) parts.push(`Kontakt:${body.contact_person}`);
        if (body.email) parts.push(`E-Mail:${body.email}`);
        if (body.phone) parts.push(`Tel:${body.phone}`);
        ctx.push(`· ${parts.join(" | ")}`);
      });
    }
    if (selectedClientCerts.length > 0) {
      ctx.push(`\n--- KUNDEN-ZERTIFIZIERUNGEN (${selectedClientCerts.length}) ---`);
      selectedClientCerts.forEach((cert: ClientCertRecord) => {
        const parts = [`${cert.clients?.name ?? "?"}: ${cert.certifications?.name ?? "N/A"}`, `ZertID:${cert.id}`];
        if (cert.clients?.id) parts.push(`KundenID:${cert.clients.id}`);
        if (cert.certificate_number) parts.push(`Zert-Nr:${cert.certificate_number}`);
        if (cert.status) parts.push(`Status:${cert.status}`);
        if (cert.valid_until) {
          const daysLeft = Math.ceil((new Date(cert.valid_until).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          parts.push(`Gültig bis:${new Date(cert.valid_until).toLocaleDateString("de-DE")}${daysLeft <= 90 ? ` (⚠️ noch ${daysLeft} Tage)` : ""}`);
        }
        if (cert.scope) parts.push(`Scope:${cert.scope}`);
        if (cert.auditors?.name) parts.push(`Auditor:${cert.auditors.name}`);
        ctx.push(`· ${parts.join(" | ")}`);
      });
    }
    if (selectedAudits.length > 0) {
      ctx.push(`\n--- AUDITS (${selectedAudits.length}) ---`);
      selectedAudits.forEach((audit: AuditRecord) => {
        const parts = [`${audit.type} @ ${audit.clients?.name ?? "?"}`, `AuditID:${audit.id}`];
        if (audit.clients?.id) parts.push(`KundenID:${audit.clients.id}`);
        if (audit.client_certifications?.certifications?.name)
          parts.push(`Zertifizierung:${audit.client_certifications.certifications.name}`);
        parts.push(`Datum:${new Date(audit.scheduled_date).toLocaleDateString("de-DE")}`);
        parts.push(`Status:${audit.status}`);
        if (audit.auditors?.name) parts.push(`Auditor:${audit.auditors.name}`);
        if (audit.certification_bodies?.short_name || audit.certification_bodies?.name)
          parts.push(`ZS:${audit.certification_bodies?.short_name || audit.certification_bodies?.name}`);
        if (audit.notes) parts.push(`Notizen:${audit.notes}`);
        ctx.push(`· ${parts.join(" | ")}`);
      });
    }
    if (selectedTasks.length > 0) {
      ctx.push(`\n--- AUFGABEN (${selectedTasks.length}) ---`);
      selectedTasks.forEach((task: TaskRecord) => {
        const overdue = task.status !== "completed" && new Date(task.due_date) < now;
        const parts = [task.title, `TaskID:${task.id}`];
        if (task.audits?.clients?.name) parts.push(`Kunde:${task.audits.clients.name}`);
        if (task.audits?.clients?.id) parts.push(`KundenID:${task.audits.clients.id}`);
        if (task.audits?.id) parts.push(`AuditID:${task.audits.id}`);
        parts.push(`Fällig:${new Date(task.due_date).toLocaleDateString("de-DE")}`);
        parts.push(`Status:${task.status}${overdue ? " ⚠️ÜBERFÄLLIG" : ""}`);
        if (task.assigned_to) parts.push(`Zugewiesen:${task.assigned_to}`);
        if (task.description) parts.push(`Beschr.:${task.description}`);
        ctx.push(`· ${parts.join(" | ")}`);
      });
    }

    const databaseContext = ctx.join("\n");
    const requestOrigin = req.headers.get("origin")?.trim() ?? "";
    const appBaseUrl = ALLOWED_ORIGIN && requestOrigin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "";

    // ─── Step 3: Call agent (Claude Sonnet, streaming, prompt caching) ─
    const staticInstructions = agent.getStaticInstructions(appBaseUrl, todayStr);

    const agentMeta = JSON.stringify({
      agent: { id: agent.id, name: agent.name, icon: agent.icon },
      reasoning: routeResult.reasoning,
    });

    const systemPrompt = `${staticInstructions}\n\n${databaseContext}`;

    const aiResponse = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AGENT_MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...toClaudeMessages(recentMessages)],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Zu viele Anfragen. Bitte warten Sie einen Moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: "Fehler bei der KI-Verarbeitung" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiStream = aiResponse.body!;
    const metaEvent = new TextEncoder().encode(`event: agent_meta\ndata: ${agentMeta}\n\n`);

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
