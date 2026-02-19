import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create Supabase client for database queries
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch context data from database
    const [clientsRes, auditsRes, tasksRes, certificationsRes, auditorsRes] = await Promise.all([
      supabase.from("clients").select("id, name, client_number, contact_person, email, country, is_active"),
      supabase.from("audits").select(`
        id, type, status, scheduled_date, notes,
        clients (id, name, client_number),
        auditors (id, name),
        client_certifications (
          id,
          certifications (name)
        )
      `).order("scheduled_date", { ascending: false }).limit(100),
      supabase.from("audit_tasks").select(`
        id, title, description, status, due_date, assigned_to,
        audits (
          id, type, scheduled_date,
          clients (name, client_number)
        )
      `).order("due_date", { ascending: true }).limit(100),
      supabase.from("client_certifications").select(`
        id, status, valid_from, valid_until, certificate_number, scope,
        clients (id, name, client_number),
        certifications (name),
        auditors (id, name)
      `).limit(100),
      supabase.from("auditors").select("id, name, email, phone, certification_bodies (name)"),
    ]);

    // Build context string
    const clients = clientsRes.data || [];
    const audits = auditsRes.data || [];
    const tasks = tasksRes.data || [];
    const certifications = certificationsRes.data || [];
    const auditors = auditorsRes.data || [];
    // Filter open tasks
    const openTasks = tasks.filter((t: any) => t.status === "pending" || t.status === "in-progress");
    
    // Build a structured context
    const contextParts: string[] = [];

    // Clients summary
    contextParts.push(`=== KUNDEN (${clients.length} gesamt) ===`);
    clients.slice(0, 20).forEach((c: any) => {
      contextParts.push(`- ${c.name} (KD-Nr: ${c.client_number || "N/A"}, Land: ${c.country || "DE"}, Aktiv: ${c.is_active ? "Ja" : "Nein"})`);
    });

    // Open tasks summary
    contextParts.push(`\n=== OFFENE AUFGABEN (${openTasks.length} gesamt) ===`);
    openTasks.slice(0, 30).forEach((t: any) => {
      const clientName = t.audits?.clients?.name || "Unbekannt";
      const dueDate = t.due_date ? new Date(t.due_date).toLocaleDateString("de-DE") : "Kein Datum";
      contextParts.push(`- "${t.title}" für ${clientName} (Fällig: ${dueDate}, Status: ${t.status})`);
    });

    // Upcoming audits
    const upcomingAudits = audits.filter((a: any) => 
      a.status === "scheduled" && new Date(a.scheduled_date) >= new Date()
    );
    contextParts.push(`\n=== ANSTEHENDE AUDITS (${upcomingAudits.length}) ===`);
    upcomingAudits.slice(0, 30).forEach((a: any) => {
      const clientName = a.clients?.name || "Unbekannt";
      const certName = a.client_certifications?.certifications?.name || "N/A";
      const auditorName = a.auditors?.name || "Kein Auditor";
      const date = new Date(a.scheduled_date).toLocaleDateString("de-DE");
      contextParts.push(`- ${a.type} bei ${clientName} (${certName}) am ${date}, Auditor: ${auditorName}`);
    });

    // Certifications overview
    contextParts.push(`\n=== ZERTIFIZIERUNGEN (${certifications.length}) ===`);
    certifications.slice(0, 30).forEach((c: any) => {
      const clientName = c.clients?.name || "Unbekannt";
      const certName = c.certifications?.name || "N/A";
      const auditorName = c.auditors?.name || "Kein Auditor";
      const validUntil = c.valid_until ? new Date(c.valid_until).toLocaleDateString("de-DE") : "Unbefristet";
      contextParts.push(`- ${clientName}: ${certName} (Gültig bis: ${validUntil}, Status: ${c.status || "aktiv"}, Auditor: ${auditorName})`);
    });

    // Auditors overview
    contextParts.push(`\n=== AUDITOREN (${auditors.length}) ===`);
    auditors.forEach((a: any) => {
      const cbName = a.certification_bodies?.name || "Keine ZS";
      contextParts.push(`- ${a.name} (E-Mail: ${a.email || "N/A"}, Tel: ${a.phone || "N/A"}, Zertifizierungsstelle: ${cbName})`);
    });

    // All audits (not just upcoming)
    contextParts.push(`\n=== ALLE AUDITS (${audits.length}) ===`);
    audits.slice(0, 50).forEach((a: any) => {
      const clientName = a.clients?.name || "Unbekannt";
      const certName = a.client_certifications?.certifications?.name || "N/A";
      const auditorName = a.auditors?.name || "Kein Auditor";
      const date = new Date(a.scheduled_date).toLocaleDateString("de-DE");
      contextParts.push(`- ${a.type} bei ${clientName} (${certName}) am ${date}, Status: ${a.status}, Auditor: ${auditorName}`);
    });

    const databaseContext = contextParts.join("\n");

    const systemPrompt = `Du bist ein hilfreicher Audit-Assistent für ein Zertifizierungs-Management-System. Du hast Zugriff auf folgende Datenbank-Informationen:

${databaseContext}

Deine Aufgaben:
1. Beantworte Fragen zu Kunden, Audits, Aufgaben und Zertifizierungen basierend auf den obigen Daten.
2. Wenn nach offenen Aufgaben für einen bestimmten Kunden gefragt wird, filtere die relevanten Aufgaben heraus.
3. Gib klare, strukturierte Antworten auf Deutsch.
4. Wenn du keine passenden Daten findest, sage das ehrlich.
5. Bei Fragen zu Terminen, Fristen oder Abläufen, nutze die Audit- und Aufgabendaten.

Formatiere Listen übersichtlich mit Spiegelstrichen. Halte Antworten prägnant aber informativ.`;

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
