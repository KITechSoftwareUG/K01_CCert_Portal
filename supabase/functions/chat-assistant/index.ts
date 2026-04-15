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

// ── Generic PostgREST query builder type ──────────────────────────────────────
type SupabaseQueryBuilder = ReturnType<ReturnType<typeof createClient>["from"]>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Agent Definitions ───────────────────────────────────────────────
// Each agent has a unique ID, name, description, and a system prompt builder.
// Later these can come from the database (Agents page).

interface AgentDefinition {
  id: string;
  name: string;
  icon: string; // emoji for UI
  description: string;
  buildSystemPrompt: (ctx: AgentContext) => string;
}

interface AgentContext {
  databaseContext: string;
  appBaseUrl: string;
  todayStr: string;
}

const AGENTS: Record<string, AgentDefinition> = {
  audit_expert: {
    id: "audit_expert",
    name: "Audit-Experte",
    icon: "📋",
    description: "Beantwortet Fragen zu Audits, Terminen, Status und Planung.",
    buildSystemPrompt: (
      ctx,
    ) => `Du bist der Audit-Experte im Zertifizierungs-Management-System von CERT CONSULTING PANE.
Deine Spezialität: Audits, Termine, Auditplanung, Auditoren und Audit-Status.

DEIN KONTEXT:
${ctx.databaseContext}

LINK-FORMAT:
- Kunde: [Kundenname](${ctx.appBaseUrl}/clients/{kunden-id})
- Audit: [Audit anzeigen](${ctx.appBaseUrl}/audits/{audit-id})
- Zertifizierung: [Zertifizierung anzeigen](${ctx.appBaseUrl}/certifications/{zert-id})

STIL:
- Antworte immer auf Deutsch. Kurz, direkt, kollegial. Nutze Markdown.
- Keine erfundenen Infos. Wenn Daten fehlen, sag das offen.
- Du siehst nur einen relevanten Ausschnitt der Datenbank.`,
  },

  certification_expert: {
    id: "certification_expert",
    name: "Zertifizierungs-Experte",
    icon: "🏅",
    description: "Spezialist für Zertifizierungen, Normen, Gültigkeiten und Zertifizierungsstellen.",
    buildSystemPrompt: (
      ctx,
    ) => `Du bist der Zertifizierungs-Experte im Zertifizierungs-Management-System von CERT CONSULTING PANE.
Deine Spezialität: Zertifizierungen (SURE, FSC, PEFC, ISCC, ISO etc.), Gültigkeiten, Zertifizierungsstellen, Normen und Scopes.

DEIN KONTEXT:
${ctx.databaseContext}

LINK-FORMAT:
- Kunde: [Kundenname](${ctx.appBaseUrl}/clients/{kunden-id})
- Audit: [Audit anzeigen](${ctx.appBaseUrl}/audits/{audit-id})
- Zertifizierung: [Zertifizierung anzeigen](${ctx.appBaseUrl}/certifications/{zert-id})

STIL:
- Antworte immer auf Deutsch. Kurz, direkt, kollegial. Nutze Markdown.
- Keine erfundenen Infos. Wenn Daten fehlen, sag das offen.
- Du siehst nur einen relevanten Ausschnitt der Datenbank.`,
  },

  task_manager: {
    id: "task_manager",
    name: "Aufgaben-Manager",
    icon: "✅",
    description: "Verwaltet und informiert über Aufgaben, Fristen und To-Dos.",
    buildSystemPrompt: (
      ctx,
    ) => `Du bist der Aufgaben-Manager im Zertifizierungs-Management-System von CERT CONSULTING PANE.
Deine Spezialität: Aufgaben, Fristen, To-Dos, überfällige Tasks und Priorisierung.

DEIN KONTEXT:
${ctx.databaseContext}

LINK-FORMAT:
- Kunde: [Kundenname](${ctx.appBaseUrl}/clients/{kunden-id})
- Audit: [Audit anzeigen](${ctx.appBaseUrl}/audits/{audit-id})
- Zertifizierung: [Zertifizierung anzeigen](${ctx.appBaseUrl}/certifications/{zert-id})

STIL:
- Antworte immer auf Deutsch. Kurz, direkt, kollegial. Nutze Markdown.
- Keine erfundenen Infos. Wenn Daten fehlen, sag das offen.
- Priorisiere überfällige Aufgaben visuell (⚠️).`,
  },

  client_advisor: {
    id: "client_advisor",
    name: "Kunden-Berater",
    icon: "👥",
    description: "Experte für Kundendaten, Kontakte und Kundenbeziehungen.",
    buildSystemPrompt: (
      ctx,
    ) => `Du bist der Kunden-Berater im Zertifizierungs-Management-System von CERT CONSULTING PANE.
Deine Spezialität: Kundendaten, Kontakte, Ansprechpartner, Kundenhistorie und Kundenbeziehungen.

DEIN KONTEXT:
${ctx.databaseContext}

LINK-FORMAT:
- Kunde: [Kundenname](${ctx.appBaseUrl}/clients/{kunden-id})
- Audit: [Audit anzeigen](${ctx.appBaseUrl}/audits/{audit-id})
- Zertifizierung: [Zertifizierung anzeigen](${ctx.appBaseUrl}/certifications/{zert-id})

STIL:
- Antworte immer auf Deutsch. Kurz, direkt, kollegial. Nutze Markdown.
- Keine erfundenen Infos. Wenn Daten fehlen, sag das offen.`,
  },

  general_assistant: {
    id: "general_assistant",
    name: "Allgemein-Assistent",
    icon: "💬",
    description: "Allgemeiner Assistent für Begrüßungen und übergreifende Fragen.",
    buildSystemPrompt: (
      ctx,
    ) => `Du bist ein freundlicher, lockerer KI-Assistent im Zertifizierungs-Management-System von CERT CONSULTING PANE.

DEIN KONTEXT:
${ctx.databaseContext}

WICHTIG:
- Du siehst absichtlich nur einen relevanten Ausschnitt der Datenbank, nicht den gesamten Bestand.
- Wenn für eine Frage nicht genug Daten im Kontext sind, sag das klar und knapp statt zu raten.
- Nutze nur echte Daten aus dem Kontext.

LINK-FORMAT:
- Kunde: [Kundenname](${ctx.appBaseUrl}/clients/{kunden-id})
- Audit: [Audit anzeigen](${ctx.appBaseUrl}/audits/{audit-id})
- Zertifizierung: [Zertifizierung anzeigen](${ctx.appBaseUrl}/certifications/{zert-id})

STIL:
- Antworte immer auf Deutsch. Kurz, direkt, kollegial. Nutze Markdown.
- Keine erfundenen Infos.`,
  },
};

// ─── Router: classify intent via tool-calling ────────────────────────

const ROUTER_SYSTEM_PROMPT = `Du bist ein Router im Zertifizierungs-Management-System. Deine einzige Aufgabe ist es, die Benutzeranfrage dem passenden Agenten zuzuweisen.

Verfügbare Agenten:
- audit_expert: Fragen zu Audits, Audit-Terminen, Audit-Planung, Auditoren, Audit-Status
- certification_expert: Fragen zu Zertifizierungen, Normen, ISO, FSC, PEFC, SURE, ISCC, Gültigkeiten, Zertifizierungsstellen
- task_manager: Fragen zu Aufgaben, To-Dos, Fristen, überfälligen Tasks
- client_advisor: Fragen zu Kunden, Kontakten, Firmen, Ansprechpartnern
- general_assistant: Begrüßungen, allgemeine Fragen, alles was nicht klar in eine Kategorie passt

Analysiere die letzte Nachricht des Benutzers und wähle den passenden Agenten.`;

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
          description: "ID des ausgewählten Agenten",
        },
        reasoning: {
          type: "string",
          description: "Kurze Begründung (1 Satz) warum dieser Agent gewählt wurde",
        },
      },
      required: ["agent_id", "reasoning"],
      additionalProperties: false,
    },
  },
};

async function routeToAgent(messages: Message[], apiKey: string): Promise<{ agentId: string; reasoning: string }> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: ROUTER_SYSTEM_PROMPT }, ...messages.slice(-3)],
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

// ─── Data Fetching (unchanged logic) ─────────────────────────────────

const MAX_CHAT_HISTORY = 8;
const MAX_CLIENTS = 12;
const MAX_AUDITS = 12;
const MAX_TASKS = 14;
const MAX_CERTIFICATIONS = 10;
const MAX_AUDITORS = 8;
const MAX_CONTACTS = 8;
const MAX_CERT_BODIES = 6;

const normalize = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractKeywords = (text: string) => {
  const stopWords = new Set([
    "der",
    "die",
    "das",
    "und",
    "oder",
    "ein",
    "eine",
    "einer",
    "einem",
    "einen",
    "dem",
    "den",
    "des",
    "ich",
    "du",
    "wir",
    "ihr",
    "sie",
    "er",
    "es",
    "mit",
    "von",
    "für",
    "bei",
    "zu",
    "im",
    "in",
    "am",
    "auf",
    "an",
    "ist",
    "sind",
    "war",
    "waren",
    "bitte",
    "zeige",
    "gib",
    "mir",
    "alle",
    "den",
    "zur",
    "zum",
    "nach",
    "vor",
    "über",
    "unter",
    "welche",
    "welcher",
    "welches",
    "was",
    "wie",
    "wann",
    "wo",
    "kurz",
    "sehr",
    "max",
    "sätze",
    "satze",
    "freundliche",
    "formellen",
    "floskeln",
    "beginne",
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

// ─── Main Handler ────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const latestUserMessage =
      [...recentMessages].reverse().find((message: Message) => message?.role === "user")?.content ?? "";
    const latestUserText = String(latestUserMessage);
    const normalizedLatestText = normalize(latestUserText);
    const keywords = extractKeywords(latestUserText);
    const isGreetingRequest =
      normalizedLatestText.includes("begru") || normalizedLatestText.includes("willkommen zuruck");

    // ─── Step 1: Route to the right agent ────────────────────────────
    const routeResult = await routeToAgent(recentMessages, OPENAI_API_KEY);
    const agent = AGENTS[routeResult.agentId] || AGENTS.general_assistant;

    console.log(
      `[Agent Router] User: ${userId} | Agent: ${agent.id} (${agent.name}) | Reason: ${routeResult.reasoning}`,
    );

    // ─── Step 2: Fetch database context ──────────────────────────────
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const now = new Date();
    const todayStr = now.toLocaleDateString("de-DE");

    const hasAuditWords = keywords.some((k) => ["audit", "prüfung", "termin", "besuch"].includes(k));
    const hasClientWords = keywords.some((k) => ["kunde", "firma", "unternehmen", "mandant"].includes(k));
    const hasTaskWords = keywords.some((k) => ["aufgabe", "task", "todo", "erledigen", "fällig"].includes(k));
    const hasCertWords = keywords.some((k) => ["zertifikat", "norm", "iso", "standard", "gültig"].includes(k));
    const hasAuditorWords = keywords.some((k) => ["auditor", "person", "wer"].includes(k));

    // Helper for keyword filtering in Supabase
    const applyKeywordFilter = (query: SupabaseQueryBuilder, columns: string[]): SupabaseQueryBuilder => {
      if (keywords.length === 0) return query.limit(20);
      const filterString = columns.map((col) => `${col}.ilike.%${keywords[0]}%`).join(",");
      return query.or(filterString).limit(50);
    };

    const fetchPromises = [];

    // 1. CLIENTS
    if (isGreetingRequest || hasClientWords || keywords.length === 0) {
      let q = supabase
        .from("clients")
        .select("id, name, client_number, contact_person, email, phone, country, is_active, consultant");
      if (!isGreetingRequest && keywords.length > 0)
        q = applyKeywordFilter(q, ["name", "client_number", "contact_person"]);
      else q = q.limit(MAX_CLIENTS);
      fetchPromises.push(q.then((res) => ({ type: "clients", data: res.data || [] })));
    } else {
      fetchPromises.push(Promise.resolve({ type: "clients", data: [] }));
    }

    // 2. AUDITS
    if (isGreetingRequest || hasAuditWords || keywords.length === 0) {
      let q = supabase.from("audits").select(`
        id, type, status, scheduled_date, notes,
        clients (id, name, client_number),
        auditors (id, name),
        certification_bodies (id, name, short_name),
        client_certifications (id, certifications (id, name))
      `);
      if (isGreetingRequest) {
        q = q.gte("scheduled_date", now.toISOString()).limit(10);
      } else if (keywords.length > 0) {
        q = applyKeywordFilter(q, ["type", "status", "notes"]);
      } else {
        q = q.order("scheduled_date", { ascending: true }).limit(MAX_AUDITS);
      }
      fetchPromises.push(q.then((res) => ({ type: "audits", data: res.data || [] })));
    } else {
      fetchPromises.push(Promise.resolve({ type: "audits", data: [] }));
    }

    // 3. TASKS
    if (isGreetingRequest || hasTaskWords || keywords.length === 0) {
      let q = supabase.from("audit_tasks").select(`
        id, title, description, status, due_date, assigned_to,
        audits (id, type, scheduled_date, status, clients (id, name, client_number))
      `);
      if (isGreetingRequest) {
        q = q.or(`status.eq.pending,status.eq.in-progress`).limit(15);
      } else if (keywords.length > 0) {
        q = applyKeywordFilter(q, ["title", "description"]);
      } else {
        q = q.order("due_date", { ascending: true }).limit(MAX_TASKS);
      }
      fetchPromises.push(q.then((res) => ({ type: "tasks", data: res.data || [] })));
    } else {
      fetchPromises.push(Promise.resolve({ type: "tasks", data: [] }));
    }

    // 4. CERTIFICATIONS
    if (isGreetingRequest || hasCertWords || keywords.length === 0) {
      let q = supabase.from("client_certifications").select(`
        id, status, valid_from, valid_until, certificate_number, scope,
        clients (id, name, client_number),
        certifications (id, name),
        auditors (id, name)
      `);
      if (isGreetingRequest) {
        q = q.lte("valid_until", new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()).limit(10);
      } else if (keywords.length > 0) {
        q = applyKeywordFilter(q, ["certificate_number", "scope", "status"]);
      } else {
        q = q.limit(MAX_CERTIFICATIONS);
      }
      fetchPromises.push(q.then((res) => ({ type: "clientCerts", data: res.data || [] })));
    } else {
      fetchPromises.push(Promise.resolve({ type: "clientCerts", data: [] }));
    }

    // 5. AUDITORS
    if (hasAuditorWords || (!isGreetingRequest && keywords.length === 0)) {
      let q = supabase.from("auditors").select("id, name, email, phone, certification_bodies (name, short_name)");
      if (keywords.length > 0) q = applyKeywordFilter(q, ["name", "email"]);
      else q = q.limit(MAX_AUDITORS);
      fetchPromises.push(q.then((res) => ({ type: "auditors", data: res.data || [] })));
    } else {
      fetchPromises.push(Promise.resolve({ type: "auditors", data: [] }));
    }

    // 6. CERT BODIES & CONTACTS
    if (keywords.length > 0) {
      fetchPromises.push(
        applyKeywordFilter(
          supabase.from("certification_bodies").select("id, name, short_name, contact_person, email, phone"),
          ["name", "short_name"],
        ).then((res) => ({ type: "certBodies", data: res.data || [] })),
      );
      fetchPromises.push(
        applyKeywordFilter(
          supabase
            .from("contacts")
            .select("id, name, role, email, phone, is_primary, clients (id, name, client_number)"),
          ["name", "role", "email"],
        ).then((res) => ({ type: "contacts", data: res.data || [] })),
      );
      fetchPromises.push(
        supabase
          .from("certifications")
          .select("id, name, description")
          .limit(10)
          .then((res) => ({ type: "certTypes", data: res.data || [] })),
      );
    } else {
      fetchPromises.push(Promise.resolve({ type: "certBodies", data: [] }));
      fetchPromises.push(Promise.resolve({ type: "contacts", data: [] }));
      fetchPromises.push(
        supabase
          .from("certifications")
          .select("id, name, description")
          .limit(8)
          .then((res) => ({ type: "certTypes", data: res.data || [] })),
      );
    }

    const results = await Promise.all(fetchPromises);
    const dataMap = Object.fromEntries(results.map((r) => [r.type, r.data]));

    const clients = dataMap.clients || [];
    const audits = dataMap.audits || [];
    const tasks = dataMap.tasks || [];
    const clientCerts = dataMap.clientCerts || [];
    const auditors = dataMap.auditors || [];
    const certBodies = dataMap.certBodies || [];
    const contacts = dataMap.contacts || [];
    const certTypes = dataMap.certTypes || [];

    const openTasks = (tasks as TaskRecord[]).filter((t) => t.status === "pending" || t.status === "in-progress");
    const overdueTasks = openTasks.filter((t) => new Date(t.due_date) < now);
    const upcomingAudits = (audits as AuditRecord[]).filter((a) => new Date(a.scheduled_date) >= now);
    const expiringCerts = (clientCerts as ClientCertRecord[])
      .filter((cc) => cc.valid_until)
      .sort((a, b) => new Date(a.valid_until!).getTime() - new Date(b.valid_until!).getTime());

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
      ...(isGreetingRequest ? upcomingAudits.slice(0, 6) : []),
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
      ...(isGreetingRequest ? overdueTasks.slice(0, 6) : []),
    ]
      .filter(
        (task: TaskRecord, index: number, array: TaskRecord[]) =>
          array.findIndex((item) => item.id === task.id) === index,
      )
      .slice(0, MAX_TASKS);

    const relatedClientIds = new Set([
      ...(selectedClients as ClientRecord[]).map((client) => client.id),
      ...selectedAudits.map((audit) => audit.clients?.id).filter(Boolean),
      ...selectedTasks.map((task) => task.audits?.clients?.id).filter(Boolean),
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

    // ─── Build database context ──────────────────────────────────────
    const ctx: string[] = [];
    ctx.push(`AKTUELLES DATUM: ${todayStr}`);
    ctx.push(`KONTEXT-HINWEIS: Sende nur Ausschnitte der Datenbank. Wenn Informationen fehlen, sag das offen.`);
    ctx.push(
      `ÜBERSICHT: ${clients.length} Kunden, ${audits.length} Audits, ${tasks.length} Aufgaben, ${clientCerts.length} Kunden-Zertifizierungen.`,
    );
    ctx.push(
      `STATUS: ${openTasks.length} offene Aufgaben, ${overdueTasks.length} überfällige Aufgaben, ${upcomingAudits.length} kommende Audits.`,
    );

    if (selectedCertTypes.length > 0) {
      ctx.push(`\n=== RELEVANTE ZERTIFIZIERUNGSSTANDARDS (${selectedCertTypes.length}) ===`);
      selectedCertTypes.forEach((cert: CertTypeRecord) =>
        ctx.push(`- ${cert.name}${cert.description ? ` – ${cert.description}` : ""}`),
      );
    }
    if (selectedClients.length > 0) {
      ctx.push(`\n=== RELEVANTE KUNDEN (${selectedClients.length}) ===`);
      selectedClients.forEach((client: ClientRecord) => {
        const parts = [client.name, `ID: ${client.id}`];
        if (client.client_number) parts.push(`KD-Nr: ${client.client_number}`);
        if (client.country) parts.push(`Land: ${client.country}`);
        if (client.contact_person) parts.push(`Ansprechpartner: ${client.contact_person}`);
        if (client.consultant) parts.push(`Berater: ${client.consultant}`);
        parts.push(`Aktiv: ${client.is_active ? "Ja" : "Nein"}`);
        ctx.push(`- ${parts.join(" | ")}`);
      });
    }
    if (selectedContacts.length > 0) {
      ctx.push(`\n=== RELEVANTE KONTAKTE (${selectedContacts.length}) ===`);
      selectedContacts.forEach((contact: ContactRecord) => {
        const parts = [`${contact.name} (${contact.clients?.name ?? "Unbekannt"})`];
        if (contact.role) parts.push(`Rolle: ${contact.role}`);
        if (contact.email) parts.push(`E-Mail: ${contact.email}`);
        if (contact.phone) parts.push(`Tel: ${contact.phone}`);
        if (contact.is_primary) parts.push("Hauptkontakt");
        ctx.push(`- ${parts.join(" | ")}`);
      });
    }
    if (selectedAuditors.length > 0) {
      ctx.push(`\n=== RELEVANTE AUDITOREN (${selectedAuditors.length}) ===`);
      selectedAuditors.forEach((auditor: AuditorRecord) => {
        const parts = [auditor.name];
        if (auditor.certification_bodies?.short_name || auditor.certification_bodies?.name)
          parts.push(`ZS: ${auditor.certification_bodies?.short_name || auditor.certification_bodies?.name}`);
        if (auditor.email) parts.push(`E-Mail: ${auditor.email}`);
        if (auditor.phone) parts.push(`Tel: ${auditor.phone}`);
        ctx.push(`- ${parts.join(" | ")}`);
      });
    }
    if (selectedCertBodies.length > 0) {
      ctx.push(`\n=== RELEVANTE ZERTIFIZIERUNGSSTELLEN (${selectedCertBodies.length}) ===`);
      selectedCertBodies.forEach((body: CertBodyRecord) => {
        const parts = [body.name];
        if (body.short_name) parts.push(`Kürzel: ${body.short_name}`);
        if (body.contact_person) parts.push(`Kontakt: ${body.contact_person}`);
        if (body.email) parts.push(`E-Mail: ${body.email}`);
        if (body.phone) parts.push(`Tel: ${body.phone}`);
        ctx.push(`- ${parts.join(" | ")}`);
      });
    }
    if (selectedClientCerts.length > 0) {
      ctx.push(`\n=== RELEVANTE KUNDEN-ZERTIFIZIERUNGEN (${selectedClientCerts.length}) ===`);
      selectedClientCerts.forEach((cert: ClientCertRecord) => {
        const parts = [
          `${cert.clients?.name ?? "Unbekannt"}: ${cert.certifications?.name ?? "N/A"}`,
          `Zert-ID: ${cert.id}`,
        ];
        if (cert.clients?.id) parts.push(`Kunden-ID: ${cert.clients.id}`);
        if (cert.certifications?.id) parts.push(`Standard-ID: ${cert.certifications.id}`);
        if (cert.certificate_number) parts.push(`Zert-Nr: ${cert.certificate_number}`);
        if (cert.status) parts.push(`Status: ${cert.status}`);
        if (cert.valid_until) parts.push(`Gültig bis: ${new Date(cert.valid_until).toLocaleDateString("de-DE")}`);
        if (cert.scope) parts.push(`Scope: ${cert.scope}`);
        if (cert.auditors?.name) parts.push(`Auditor: ${cert.auditors.name}`);
        ctx.push(`- ${parts.join(" | ")}`);
      });
    }
    if (selectedAudits.length > 0) {
      ctx.push(`\n=== RELEVANTE AUDITS (${selectedAudits.length}) ===`);
      selectedAudits.forEach((audit: AuditRecord) => {
        const parts = [`${audit.type} bei ${audit.clients?.name ?? "Unbekannt"}`, `Audit-ID: ${audit.id}`];
        if (audit.clients?.id) parts.push(`Kunden-ID: ${audit.clients.id}`);
        if (audit.client_certifications?.id) parts.push(`Zert-ID: ${audit.client_certifications.id}`);
        if (audit.client_certifications?.certifications?.id)
          parts.push(`Standard-ID: ${audit.client_certifications.certifications.id}`);
        if (audit.client_certifications?.certifications?.name)
          parts.push(`Zertifizierung: ${audit.client_certifications.certifications.name}`);
        parts.push(`Datum: ${new Date(audit.scheduled_date).toLocaleDateString("de-DE")}`);
        parts.push(`Status: ${audit.status}`);
        if (audit.auditors?.name) parts.push(`Auditor: ${audit.auditors.name}`);
        if (audit.certification_bodies?.short_name || audit.certification_bodies?.name)
          parts.push(`ZS: ${audit.certification_bodies?.short_name || audit.certification_bodies?.name}`);
        if (audit.notes) parts.push(`Notizen: ${audit.notes}`);
        ctx.push(`- ${parts.join(" | ")}`);
      });
    }
    if (selectedTasks.length > 0) {
      ctx.push(`\n=== RELEVANTE AUFGABEN (${selectedTasks.length}) ===`);
      selectedTasks.forEach((task: TaskRecord) => {
        const overdue = task.status !== "completed" && new Date(task.due_date) < now;
        const parts = [`${task.title}`, `Task-ID: ${task.id}`];
        if (task.audits?.clients?.name) parts.push(`Kunde: ${task.audits.clients.name}`);
        if (task.audits?.clients?.id) parts.push(`Kunden-ID: ${task.audits.clients.id}`);
        if (task.audits?.id) parts.push(`Audit-ID: ${task.audits.id}`);
        if (task.audits?.type) parts.push(`Audittyp: ${task.audits.type}`);
        parts.push(`Fällig: ${new Date(task.due_date).toLocaleDateString("de-DE")}`);
        parts.push(`Status: ${task.status}${overdue ? " – ÜBERFÄLLIG" : ""}`);
        if (task.assigned_to) parts.push(`Zugewiesen: ${task.assigned_to}`);
        if (task.description) parts.push(`Beschreibung: ${task.description}`);
        ctx.push(`- ${parts.join(" | ")}`);
      });
    }

    const databaseContext = ctx.join("\n");
    // ALLOWED_ORIGIN ist optional. Wenn gesetzt, wird es als Basis für Deep-Links im LLM-Prompt verwendet.
    // Wenn nicht gesetzt, werden keine Links generiert (Chat funktioniert weiterhin ohne sie).
    // Dies verhindert, dass ein bösartiger Client eine fremde URL in den Prompt injiziert.
    const ALLOWED_ORIGIN = (Deno.env.get("ALLOWED_ORIGIN") ?? "").trim();
    const requestOrigin = req.headers.get("origin")?.trim() ?? "";
    const appBaseUrl = ALLOWED_ORIGIN && requestOrigin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "";

    // ─── Step 3: Call agent with specialized prompt ───────────────────
    const agentContext: AgentContext = { databaseContext, appBaseUrl, todayStr };
    const systemPrompt = agent.buildSystemPrompt(agentContext);

    // Send agent metadata as the first SSE event before streaming the AI response
    const agentMeta = JSON.stringify({
      agent: { id: agent.id, name: agent.name, icon: agent.icon },
      reasoning: routeResult.reasoning,
    });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }, ...recentMessages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Zu viele Anfragen. Bitte warten Sie einen Moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "KI-Kontingent erschöpft. Bitte später erneut versuchen." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Fehler bei der KI-Verarbeitung" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepend agent metadata as a custom SSE event, then pipe the AI stream
    const aiStream = response.body!;
    const metaEvent = new TextEncoder().encode(`event: agent_meta\ndata: ${agentMeta}\n\n`);

    const combinedStream = new ReadableStream({
      async start(controller) {
        // Send agent metadata first
        controller.enqueue(metaEvent);

        // Then pipe the AI stream
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
