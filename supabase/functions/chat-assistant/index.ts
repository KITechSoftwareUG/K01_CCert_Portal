import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    "der", "die", "das", "und", "oder", "ein", "eine", "einer", "einem", "einen", "dem", "den", "des",
    "ich", "du", "wir", "ihr", "sie", "er", "es", "mit", "von", "für", "bei", "zu", "im", "in", "am",
    "auf", "an", "ist", "sind", "war", "waren", "bitte", "zeige", "gib", "mir", "alle", "den", "zur",
    "zum", "nach", "vor", "über", "unter", "welche", "welcher", "welches", "was", "wie", "wann", "wo",
    "kurz", "sehr", "max", "sätze", "satze", "freundliche", "formellen", "floskeln", "beginne",
  ]);

  return Array.from(
    new Set(
      normalize(text)
        .split(/[^a-z0-9äöüß-]+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 3 && !stopWords.has(word))
    )
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

const limitAndSort = <T,>(items: T[], limit: number, scoreFn: (item: T) => number, fallbackSort?: (a: T, b: T) => number) => {
  return [...items]
    .map((item) => ({ item, score: scoreFn(item) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || (fallbackSort ? fallbackSort(a.item, b.item) : 0))
    .slice(0, limit)
    .map(({ item }) => item);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Nicht autorisiert. Bitte melden Sie sich an." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authSupabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authSupabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error("Auth validation failed:", claimsError);
      return new Response(
        JSON.stringify({ error: "Ungültiger oder abgelaufener Token." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    const { messages } = await req.json();
    const recentMessages = Array.isArray(messages) ? messages.slice(-MAX_CHAT_HISTORY) : [];
    const latestUserMessage = [...recentMessages].reverse().find((message: any) => message?.role === "user")?.content ?? "";
    const latestUserText = String(latestUserMessage);
    const normalizedLatestText = normalize(latestUserText);
    const keywords = extractKeywords(latestUserText);
    const isGreetingRequest = normalizedLatestText.includes("begru") || normalizedLatestText.includes("willkommen zuruck");

    console.log("Authenticated chat request from user:", userId, "| recent messages:", recentMessages.length, "| greeting:", isGreetingRequest);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const now = new Date();
    const todayStr = now.toLocaleDateString("de-DE");

    const [clientsRes, auditsRes, tasksRes, certificationsRes, auditorsRes, certBodiesRes, contactsRes, certsRes] = await Promise.all([
      supabase.from("clients").select("id, name, client_number, contact_person, email, phone, country, is_active, consultant"),
      supabase.from("audits").select(`
        id, type, status, scheduled_date, notes,
        clients (id, name, client_number),
        auditors (id, name),
        certification_bodies (id, name, short_name),
        client_certifications (
          id,
          certifications (id, name)
        )
      `).order("scheduled_date", { ascending: true }),
      supabase.from("audit_tasks").select(`
        id, title, description, status, due_date, assigned_to,
        audits (
          id, type, scheduled_date, status,
          clients (id, name, client_number)
        )
      `).order("due_date", { ascending: true }),
      supabase.from("client_certifications").select(`
        id, status, valid_from, valid_until, certificate_number, scope,
        clients (id, name, client_number),
        certifications (id, name),
        auditors (id, name)
      `),
      supabase.from("auditors").select("id, name, email, phone, certification_bodies (name, short_name)"),
      supabase.from("certification_bodies").select("id, name, short_name, contact_person, email, phone"),
      supabase.from("contacts").select("id, name, role, email, phone, is_primary, clients (id, name, client_number)"),
      supabase.from("certifications").select("id, name, description"),
    ]);

    const clients = clientsRes.data || [];
    const audits = auditsRes.data || [];
    const tasks = tasksRes.data || [];
    const clientCerts = certificationsRes.data || [];
    const auditors = auditorsRes.data || [];
    const certBodies = certBodiesRes.data || [];
    const contacts = contactsRes.data || [];
    const certTypes = certsRes.data || [];

    const openTasks = tasks.filter((t: any) => t.status === "pending" || t.status === "in-progress");
    const overdueTasks = openTasks.filter((t: any) => new Date(t.due_date) < now);
    const upcomingAudits = audits.filter((a: any) => new Date(a.scheduled_date) >= now);
    const expiringCerts = clientCerts
      .filter((cc: any) => cc.valid_until)
      .sort((a: any, b: any) => new Date(a.valid_until).getTime() - new Date(b.valid_until).getTime());

    const matchAllClients = keywords.length === 0 || keywords.some((keyword) => [
      ...clients.map((client: any) => `${client.name} ${client.client_number ?? ""} ${client.country ?? ""} ${client.consultant ?? ""}`),
      ...auditors.map((auditor: any) => auditor.name),
      ...certBodies.map((body: any) => `${body.name} ${body.short_name ?? ""}`),
      ...certTypes.map((cert: any) => cert.name),
    ].some((text) => normalize(text).includes(keyword)));

    const selectedClients = isGreetingRequest
      ? []
      : limitAndSort(
          clients,
          MAX_CLIENTS,
          (client: any) => scoreByKeywords(`${client.name} ${client.client_number ?? ""} ${client.country ?? ""} ${client.consultant ?? ""} ${client.contact_person ?? ""}`, keywords),
          (a: any, b: any) => a.name.localeCompare(b.name)
        );

    const selectedAudits = isGreetingRequest
      ? upcomingAudits.slice(0, 4)
      : [
          ...limitAndSort(
            audits,
            MAX_AUDITS,
            (audit: any) => {
              const certName = audit.client_certifications?.certifications?.name ?? "";
              const auditorName = audit.auditors?.name ?? "";
              const clientName = audit.clients?.name ?? "";
              return scoreByKeywords(`${clientName} ${audit.type} ${audit.status} ${certName} ${auditorName}`, keywords);
            },
            (a: any, b: any) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
          ),
          ...upcomingAudits.slice(0, 6),
        ].filter((audit: any, index: number, array: any[]) => array.findIndex((item) => item.id === audit.id) === index).slice(0, MAX_AUDITS);

    const selectedTasks = isGreetingRequest
      ? [...overdueTasks.slice(0, 5), ...openTasks.slice(0, 5)].filter((task: any, index: number, array: any[]) => array.findIndex((item) => item.id === task.id) === index).slice(0, MAX_TASKS)
      : [
          ...limitAndSort(
            tasks,
            MAX_TASKS,
            (task: any) => {
              const clientName = task.audits?.clients?.name ?? "";
              const auditType = task.audits?.type ?? "";
              return scoreByKeywords(`${task.title} ${task.description ?? ""} ${task.status} ${clientName} ${auditType} ${task.assigned_to ?? ""}`, keywords);
            },
            (a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          ),
          ...overdueTasks.slice(0, 6),
        ].filter((task: any, index: number, array: any[]) => array.findIndex((item) => item.id === task.id) === index).slice(0, MAX_TASKS);

    const relatedClientIds = new Set([
      ...selectedClients.map((client: any) => client.id),
      ...selectedAudits.map((audit: any) => audit.clients?.id).filter(Boolean),
      ...selectedTasks.map((task: any) => task.audits?.clients?.id).filter(Boolean),
    ]);

    const selectedClientCerts = isGreetingRequest
      ? expiringCerts.slice(0, 6)
      : [
          ...clientCerts.filter((cert: any) => relatedClientIds.has(cert.clients?.id)),
          ...limitAndSort(
            clientCerts,
            MAX_CERTIFICATIONS,
            (cert: any) => {
              const clientName = cert.clients?.name ?? "";
              const certName = cert.certifications?.name ?? "";
              const auditorName = cert.auditors?.name ?? "";
              return scoreByKeywords(`${clientName} ${certName} ${cert.status ?? ""} ${cert.scope ?? ""} ${cert.certificate_number ?? ""} ${auditorName}`, keywords);
            },
            (a: any, b: any) => {
              const aTime = a.valid_until ? new Date(a.valid_until).getTime() : Number.MAX_SAFE_INTEGER;
              const bTime = b.valid_until ? new Date(b.valid_until).getTime() : Number.MAX_SAFE_INTEGER;
              return aTime - bTime;
            }
          ),
        ].filter((cert: any, index: number, array: any[]) => array.findIndex((item) => item.id === cert.id) === index).slice(0, MAX_CERTIFICATIONS);

    const selectedAuditors = isGreetingRequest
      ? []
      : limitAndSort(
          auditors,
          MAX_AUDITORS,
          (auditor: any) => scoreByKeywords(`${auditor.name} ${auditor.email ?? ""} ${auditor.certification_bodies?.name ?? ""} ${auditor.certification_bodies?.short_name ?? ""}`, keywords),
          (a: any, b: any) => a.name.localeCompare(b.name)
        );

    const selectedContacts = isGreetingRequest
      ? []
      : contacts
          .filter((contact: any) => relatedClientIds.has(contact.clients?.id))
          .slice(0, MAX_CONTACTS);

    const selectedCertBodies = isGreetingRequest
      ? []
      : limitAndSort(
          certBodies,
          MAX_CERT_BODIES,
          (body: any) => scoreByKeywords(`${body.name} ${body.short_name ?? ""} ${body.contact_person ?? ""} ${body.email ?? ""}`, keywords),
          (a: any, b: any) => a.name.localeCompare(b.name)
        );

    const selectedCertTypes = isGreetingRequest || !matchAllClients
      ? certTypes.slice(0, 8)
      : certTypes.filter((cert: any) => scoreByKeywords(cert.name, keywords) > 0).slice(0, 8);

    const ctx: string[] = [];
    ctx.push(`AKTUELLES DATUM: ${todayStr}`);
    ctx.push(`KONTEXT-HINWEIS: Sende nur Ausschnitte der Datenbank. Wenn Informationen fehlen, sag das offen.`);
    ctx.push(`ÜBERSICHT: ${clients.length} Kunden, ${audits.length} Audits, ${tasks.length} Aufgaben, ${clientCerts.length} Kunden-Zertifizierungen.`);
    ctx.push(`STATUS: ${openTasks.length} offene Aufgaben, ${overdueTasks.length} überfällige Aufgaben, ${upcomingAudits.length} kommende Audits.`);

    if (selectedCertTypes.length > 0) {
      ctx.push(`\n=== RELEVANTE ZERTIFIZIERUNGSSTANDARDS (${selectedCertTypes.length}) ===`);
      selectedCertTypes.forEach((cert: any) => {
        ctx.push(`- ${cert.name}${cert.description ? ` – ${cert.description}` : ""}`);
      });
    }

    if (selectedClients.length > 0) {
      ctx.push(`\n=== RELEVANTE KUNDEN (${selectedClients.length}) ===`);
      selectedClients.forEach((client: any) => {
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
      selectedContacts.forEach((contact: any) => {
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
      selectedAuditors.forEach((auditor: any) => {
        const parts = [auditor.name];
        if (auditor.certification_bodies?.short_name || auditor.certification_bodies?.name) {
          parts.push(`ZS: ${auditor.certification_bodies?.short_name || auditor.certification_bodies?.name}`);
        }
        if (auditor.email) parts.push(`E-Mail: ${auditor.email}`);
        if (auditor.phone) parts.push(`Tel: ${auditor.phone}`);
        ctx.push(`- ${parts.join(" | ")}`);
      });
    }

    if (selectedCertBodies.length > 0) {
      ctx.push(`\n=== RELEVANTE ZERTIFIZIERUNGSSTELLEN (${selectedCertBodies.length}) ===`);
      selectedCertBodies.forEach((body: any) => {
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
      selectedClientCerts.forEach((cert: any) => {
        const parts = [`${cert.clients?.name ?? "Unbekannt"}: ${cert.certifications?.name ?? "N/A"}`, `Zert-ID: ${cert.id}`];
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
      selectedAudits.forEach((audit: any) => {
        const parts = [`${audit.type} bei ${audit.clients?.name ?? "Unbekannt"}`, `Audit-ID: ${audit.id}`];
        if (audit.clients?.id) parts.push(`Kunden-ID: ${audit.clients.id}`);
        if (audit.client_certifications?.id) parts.push(`Zert-ID: ${audit.client_certifications.id}`);
        if (audit.client_certifications?.certifications?.id) parts.push(`Standard-ID: ${audit.client_certifications.certifications.id}`);
        if (audit.client_certifications?.certifications?.name) parts.push(`Zertifizierung: ${audit.client_certifications.certifications.name}`);
        parts.push(`Datum: ${new Date(audit.scheduled_date).toLocaleDateString("de-DE")}`);
        parts.push(`Status: ${audit.status}`);
        if (audit.auditors?.name) parts.push(`Auditor: ${audit.auditors.name}`);
        if (audit.certification_bodies?.short_name || audit.certification_bodies?.name) {
          parts.push(`ZS: ${audit.certification_bodies?.short_name || audit.certification_bodies?.name}`);
        }
        if (audit.notes) parts.push(`Notizen: ${audit.notes}`);
        ctx.push(`- ${parts.join(" | ")}`);
      });
    }

    if (selectedTasks.length > 0) {
      ctx.push(`\n=== RELEVANTE AUFGABEN (${selectedTasks.length}) ===`);
      selectedTasks.forEach((task: any) => {
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
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
    const appBaseUrl = origin.replace(/\/+$/, "");

    const systemPrompt = `Du bist ein freundlicher, lockerer KI-Assistent im Zertifizierungs-Management-System von CERT CONSULTING PANE.

DEIN KONTEXT:
${databaseContext}

WICHTIG:
- Du siehst absichtlich nur einen relevanten Ausschnitt der Datenbank, nicht den gesamten Bestand.
- Wenn für eine Frage nicht genug Daten im Kontext sind, sag das klar und knapp statt zu raten.
- Nutze nur echte Daten aus dem Kontext.

LINK-FORMAT:
- Kunde: [Kundenname](${appBaseUrl}/clients/{kunden-id})
- Audit: [Audit anzeigen](${appBaseUrl}/audits/{audit-id})
- Zertifizierung: [Zertifizierung anzeigen](${appBaseUrl}/certifications/{zert-id})
Wenn du einen Kunden, ein Audit oder eine Zertifizierung mit ID im Kontext hast, verlinke direkt dorthin.

STIL:
- Antworte immer auf Deutsch.
- Kurz, direkt, kollegial.
- Nutze Markdown.
- Keine erfundenen Infos.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...recentMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Zu viele Anfragen. Bitte warten Sie einen Moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "KI-Kontingent erschöpft. Bitte später erneut versuchen." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Fehler bei der KI-Verarbeitung" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
