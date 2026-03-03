import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // AUTH CHECK: Validate the user's JWT token
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

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Verify the user's identity using getClaims
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
    console.log("Authenticated chat request from user:", userId);

    const { messages } = await req.json();

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch comprehensive context data
    const [
      clientsRes, auditsRes, tasksRes, certificationsRes,
      auditorsRes, certBodiesRes, contactsRes, certsRes
    ] = await Promise.all([
      supabase.from("clients").select("id, name, client_number, contact_person, email, phone, country, address, is_active, consultant, parent_client_id"),
      supabase.from("audits").select(`
        id, type, status, scheduled_date, notes, auditor_id, certification_body_id,
        clients (id, name, client_number),
        auditors (id, name),
        certification_bodies (id, name, short_name),
        client_certifications (
          id, scope, certificate_number,
          certifications (name)
        )
      `).order("scheduled_date", { ascending: true }),
      supabase.from("audit_tasks").select(`
        id, title, description, status, due_date, assigned_to, completed_at,
        audits (
          id, type, scheduled_date, status,
          clients (name, client_number)
        )
      `).order("due_date", { ascending: true }),
      supabase.from("client_certifications").select(`
        id, status, valid_from, valid_until, certificate_number, scope, notes,
        clients (id, name, client_number),
        certifications (name),
        auditors (id, name)
      `),
      supabase.from("auditors").select("id, name, email, phone, notes, certification_bodies (name, short_name)"),
      supabase.from("certification_bodies").select("id, name, short_name, contact_person, email, phone, website"),
      supabase.from("contacts").select("id, name, role, email, phone, is_primary, clients (name, client_number)"),
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

    const now = new Date();
    const todayStr = now.toLocaleDateString("de-DE");

    // Build structured context
    const ctx: string[] = [];
    ctx.push(`AKTUELLES DATUM: ${todayStr}\n`);

    // Certification types
    ctx.push(`=== ZERTIFIZIERUNGSSTANDARDS (${certTypes.length}) ===`);
    certTypes.forEach((c: any) => {
      ctx.push(`- ${c.name}${c.description ? ` – ${c.description}` : ''}`);
    });

    // Clients with full details including ID for links
    ctx.push(`\n=== KUNDEN (${clients.length}) ===`);
    clients.forEach((c: any) => {
      const parts = [`${c.name}`];
      parts.push(`ID: ${c.id}`);
      if (c.client_number) parts.push(`KD-Nr: ${c.client_number}`);
      if (c.country) parts.push(`Land: ${c.country}`);
      if (c.address) parts.push(`Adresse: ${c.address}`);
      if (c.contact_person) parts.push(`Ansprechpartner: ${c.contact_person}`);
      if (c.email) parts.push(`E-Mail: ${c.email}`);
      if (c.phone) parts.push(`Tel: ${c.phone}`);
      if (c.consultant) parts.push(`Berater: ${c.consultant}`);
      parts.push(`Aktiv: ${c.is_active ? 'Ja' : 'Nein'}`);
      ctx.push(`- ${parts.join(' | ')}`);
    });

    // Contacts
    if (contacts.length > 0) {
      ctx.push(`\n=== KONTAKTPERSONEN (${contacts.length}) ===`);
      contacts.forEach((c: any) => {
        const clientName = c.clients?.name || "Unbekannt";
        const parts = [`${c.name} (${clientName})`];
        if (c.role) parts.push(`Rolle: ${c.role}`);
        if (c.email) parts.push(`E-Mail: ${c.email}`);
        if (c.phone) parts.push(`Tel: ${c.phone}`);
        if (c.is_primary) parts.push(`[Hauptkontakt]`);
        ctx.push(`- ${parts.join(' | ')}`);
      });
    }

    // Auditors
    ctx.push(`\n=== AUDITOREN (${auditors.length}) ===`);
    auditors.forEach((a: any) => {
      const parts = [`${a.name}`];
      if (a.email) parts.push(`E-Mail: ${a.email}`);
      if (a.phone) parts.push(`Tel: ${a.phone}`);
      const cbName = a.certification_bodies?.name || a.certification_bodies?.short_name;
      if (cbName) parts.push(`Zertifizierungsstelle: ${cbName}`);
      if (a.notes) parts.push(`Notizen: ${a.notes}`);
      ctx.push(`- ${parts.join(' | ')}`);
    });

    // Certification bodies
    ctx.push(`\n=== ZERTIFIZIERUNGSSTELLEN (${certBodies.length}) ===`);
    certBodies.forEach((cb: any) => {
      const parts = [`${cb.name}`];
      if (cb.short_name) parts.push(`Kürzel: ${cb.short_name}`);
      if (cb.contact_person) parts.push(`Kontakt: ${cb.contact_person}`);
      if (cb.email) parts.push(`E-Mail: ${cb.email}`);
      if (cb.phone) parts.push(`Tel: ${cb.phone}`);
      if (cb.website) parts.push(`Web: ${cb.website}`);
      ctx.push(`- ${parts.join(' | ')}`);
    });

    // Client certifications
    ctx.push(`\n=== KUNDEN-ZERTIFIZIERUNGEN (${clientCerts.length}) ===`);
    clientCerts.forEach((cc: any) => {
      const clientName = cc.clients?.name || "Unbekannt";
      const clientId = cc.clients?.id || "";
      const certName = cc.certifications?.name || "N/A";
      const auditorName = cc.auditors?.name || "Kein Auditor";
      const parts = [`${clientName}: ${certName}`];
      parts.push(`Zert-ID: ${cc.id}`);
      if (clientId) parts.push(`Kunden-ID: ${clientId}`);
      if (cc.certificate_number) parts.push(`Zert-Nr: ${cc.certificate_number}`);
      if (cc.scope) parts.push(`Scope: ${cc.scope}`);
      parts.push(`Status: ${cc.status || 'aktiv'}`);
      if (cc.valid_from) parts.push(`Gültig ab: ${new Date(cc.valid_from).toLocaleDateString("de-DE")}`);
      if (cc.valid_until) parts.push(`Gültig bis: ${new Date(cc.valid_until).toLocaleDateString("de-DE")}`);
      parts.push(`Auditor: ${auditorName}`);
      if (cc.notes) parts.push(`Notizen: ${cc.notes}`);
      ctx.push(`- ${parts.join(' | ')}`);
    });

    // All audits
    ctx.push(`\n=== AUDITS (${audits.length}) ===`);
    audits.forEach((a: any) => {
      const clientName = a.clients?.name || "Unbekannt";
      const clientId = a.clients?.id || "";
      const certName = a.client_certifications?.certifications?.name || "N/A";
      const auditorName = a.auditors?.name || "Kein Auditor";
      const cbName = a.certification_bodies?.short_name || a.certification_bodies?.name || "";
      const date = new Date(a.scheduled_date).toLocaleDateString("de-DE");
      const parts = [`${a.type} bei ${clientName}`];
      parts.push(`Audit-ID: ${a.id}`);
      if (clientId) parts.push(`Kunden-ID: ${clientId}`);
      parts.push(`Zertifizierung: ${certName}`);
      parts.push(`Datum: ${date}`);
      parts.push(`Status: ${a.status}`);
      parts.push(`Auditor: ${auditorName}`);
      if (cbName) parts.push(`ZS: ${cbName}`);
      if (a.notes) parts.push(`Notizen: ${a.notes}`);
      ctx.push(`- ${parts.join(' | ')}`);
    });

    // Tasks with status analysis
    const openTasks = tasks.filter((t: any) => t.status === "pending" || t.status === "in-progress");
    const overdueTasks = openTasks.filter((t: any) => new Date(t.due_date) < now);
    const completedTasks = tasks.filter((t: any) => t.status === "completed");

    ctx.push(`\n=== AUFGABEN (${tasks.length} gesamt, ${openTasks.length} offen, ${overdueTasks.length} überfällig, ${completedTasks.length} erledigt) ===`);
    tasks.forEach((t: any) => {
      const clientName = t.audits?.clients?.name || "Unbekannt";
      const auditType = t.audits?.type || "";
      const dueDate = new Date(t.due_date).toLocaleDateString("de-DE");
      const isOverdue = t.status !== "completed" && new Date(t.due_date) < now;
      const parts = [`"${t.title}" für ${clientName} (${auditType})`];
      parts.push(`Fällig: ${dueDate}`);
      parts.push(`Status: ${t.status}${isOverdue ? ' – ÜBERFÄLLIG' : ''}`);
      if (t.assigned_to) parts.push(`Zugewiesen: ${t.assigned_to}`);
      if (t.description) parts.push(`Beschreibung: ${t.description}`);
      ctx.push(`- ${parts.join(' | ')}`);
    });

    const databaseContext = ctx.join("\n");

    // Determine the app base URL from the request origin or referer
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
    const appBaseUrl = origin.replace(/\/+$/, "");

    const systemPrompt = `Du bist ein freundlicher, lockerer KI-Assistent im Zertifizierungs-Management-System von CERT CONSULTING PANE. Du kennst dich bestens mit Zertifizierungsaudits (SURE, FSC, PEFC, ISCC, ISO 9001, ISO 14001) aus und hilfst Beratern im Alltag.

DEINE DATENBANK:
${databaseContext}

LINK-FORMAT:
Die App hat folgende Routen. Wenn du einen Kunden, ein Audit oder eine Zertifizierung erwähnst, verlinke immer direkt dorthin:
- Kunde: [Kundenname](${appBaseUrl}/clients/{kunden-id})
- Audit: [Audit anzeigen](${appBaseUrl}/audits/{audit-id})
- Zertifizierung: [Zertifizierung anzeigen](${appBaseUrl}/certifications/{zert-id})
Die IDs findest du in den Daten oben (ID-Felder). Setze IMMER Links, wenn du einen Kunden, ein Audit oder eine Zertifizierung namentlich erwähnst!

DEINE FÄHIGKEITEN:
1. **Datenabfragen**: Alle Fragen zu Kunden, Audits, Aufgaben, Zertifizierungen, Auditoren und Zertifizierungsstellen beantworten.
2. **Analyse & Planung**: Muster, Risiken und Handlungsbedarf erkennen (ablaufende Zertifikate, überfällige Aufgaben, Auditor-Auslastung).
3. **Terminplanung**: Audits planen unter Berücksichtigung von Fristen.
4. **Zusammenfassungen**: Übersichten zu Kunden, Auditoren oder Zeiträumen.
5. **Proaktive Hinweise**: Bei Problemen (überfällige Tasks, ablaufende Zertifikate) direkt darauf hinweisen.

STIL-REGELN:
- Antworte IMMER auf Deutsch.
- Sei locker, freundlich und direkt – wie ein hilfsbereiter Kollege. Keine steifen Formulierungen.
- Halte dich kurz. Keine unnötigen Einleitungen oder Floskeln. Komm direkt zum Punkt.
- Nutze Markdown für Struktur (Listen, **fett**, Links).
- Verlinke Kunden, Audits und Zertifizierungen IMMER als Markdown-Link.
- Wenn du etwas nicht weißt, sag das ehrlich und kurz.
- Erfinde NICHTS – nur echte Daten aus der Datenbank.
- Beachte das aktuelle Datum für Fälligkeiten.`;

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
          ...messages,
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
